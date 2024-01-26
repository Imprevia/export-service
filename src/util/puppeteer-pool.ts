import puppeteer, { Browser, BrowserContext } from 'puppeteer-core';
import { createPool, Pool } from 'generic-pool';
import * as findChrome from 'carlo/lib/find_chrome';

interface IPuppeteerPool {
  max?: number;
  min?: number;
  maxUses?: number;
  testOnBorrow?: boolean;
  autostart?: boolean;
  idleTimeoutMillis?: number;
  evictionRunIntervalMillis?: number;
  puppeteerArgs?: number;
  validator?: () => Promise<boolean>;
}
export class PuppeteerPool {
  private static _instance: PuppeteerPool;
  private _options: IPuppeteerPool;
  private _useCount = 0;
  private _browser: Browser;
  private _pool: Pool<BrowserContext>;

  public static async getInstance(options: IPuppeteerPool = {}) {
    if (!this._instance) {
      this._instance = new PuppeteerPool(options);
      await this._instance.init();
    }
    return this._instance;
  }

  /**
   * 初始化一个 Puppeteer 池
   * @param {Object} [options={}] 创建池的配置配置
   * @param {Number} [options.max=10] 最多产生多少个 puppeteer 实例 。如果你设置它，请确保 在引用关闭时调用清理池。 pool.drain().then(()=>pool.clear())
   * @param {Number} [options.min=1] 保证池中最少有多少个实例存活
   * @param {Number} [options.maxUses=2048] 每一个 实例 最大可重用次数，超过后将重启实例。0表示不检验
   * @param {Number} [options.testOnBorrow=2048] 在将 实例 提供给用户之前，池应该验证这些实例。
   * @param {Boolean} [options.autostart=false] 是不是需要在 池 初始化时 初始化 实例
   * @param {Number} [options.idleTimeoutMillis=3600000] 如果一个实例 60分钟 都没访问就关掉他
   * @param {Number} [options.evictionRunIntervalMillis=180000] 每 3分钟 检查一次 实例的访问状态
   * @param {Object} [options.puppeteerArgs={}] puppeteer.launch 启动的参数
   * @param {Function} [options.validator=(instance)=>Promise.resolve(true))] 用户自定义校验 参数是 取到的一个实例
   * @param {Object} [options.otherConfig={}] 剩余的其他参数 // For all opts, see opts at https://github.com/coopernurse/node-pool#createpool
   */
  constructor(options: IPuppeteerPool = {}) {
    this._options = options;
  }

  public async init() {
    await this._initBrowser();
    this._initPool();
  }

  private async _initBrowser() {
    // 创建一个 puppeteer 实例
    const findChromePath = await findChrome({});
    const executablePath = findChromePath.executablePath;
    this._browser = await puppeteer.launch({
      args: [
        // Required for Docker version of Puppeteer
        '--no-sandbox',
        '--disable-setuid-sandbox',
        // This will write shared memory files into /tmp instead of /dev/shm,
        // because Docker’s default for /dev/shm is 64MB
        '--disable-dev-shm-usage',
      ],
      headless: true,
      executablePath,
    });
  }

  private _initPool() {
    const {
      max = 10,
      min = 2,
      maxUses = 2028,
      testOnBorrow = true,
      autostart = false,
      idleTimeoutMillis = 3600000,
      evictionRunIntervalMillis = 180000,
      validator = (instance: BrowserContext) => Promise.resolve(true),
      ...otherConfig
    } = this._options;

    const factory = {
      create: async () => {
        // 创建一个匿名的浏览器上下文
        const instance = this._browser;
        // 创建一个 puppeteer 实例 ，并且初始化使用次数为 0
        this._useCount = 0;
        return await instance.createIncognitoBrowserContext();
      },
      destroy: async (instance: BrowserContext) => {
        await instance.close();
      },
      validate: async (instance: BrowserContext) => {
        // 执行一次自定义校验，并且校验校验 实例已使用次数。 当 返回 reject 时 表示实例不可用
        const valid = await validator(instance);
        return valid && (maxUses <= 0 || this._useCount < maxUses);
      },
    };
    const config = {
      max,
      min,
      testOnBorrow,
      autostart,
      idleTimeoutMillis,
      evictionRunIntervalMillis,
      ...otherConfig,
    };
    this._pool = createPool(factory, config);
    const genericAcquire = this._pool.acquire.bind(this._pool);
    // 重写了原有池的消费实例的方法。添加一个实例使用次数的增加
    this._pool.acquire = () =>
      genericAcquire().then((instance: BrowserContext) => {
        this._useCount += 1;
        return instance;
      });
  }

  public async use(fn: (instance: BrowserContext) => Promise<any>) {
    let resource: BrowserContext;
    return this._pool
      .acquire()
      .then(async r => {
        resource = r;
        return resource;
      })
      .then(fn)
      .then(
        result => {
          // 不管业务方使用实例成功与后都表示一下实例消费完成
          this._pool.release(resource);
          return result;
        },
        err => {
          this._pool.release(resource);
          throw err;
        }
      );
  }

  get pool(): Pool<BrowserContext> {
    return this._pool;
  }
}
