import { defineConfig, loadEnv } from 'vite'
import { createVuePlugin } from 'vite-plugin-vue2'
import VuePluginHtmlEnv from 'vite-plugin-html-env'
import externalGlobals from "rollup-plugin-external-globals";
import requireTransform from 'vite-plugin-require-transform';
import viteCompression from 'vite-plugin-compression';
import legacy from '@vitejs/plugin-legacy';
import polyfillNode from 'rollup-plugin-polyfill-node';

// https://vitejs.dev/config/
export default ({ mode }) => {
  const isProd = mode == 'production' || mode == 'preview'; // 生产
  const env = loadEnv(mode, process.cwd()); // vite 环境变量
  // vite配置文件、代码中仍可继续使用之前的 process.env.xx，html中的环境变量不要改成<{ VITE_xx }> 环境变量必须以VITE开头才能被vite识别
  process.env = { ...process.env, ...env }; // 让代码中process.env.xx仍能使用
  return defineConfig({
    base: mode == 'development' ? './' : '/',
    define: {
      'process.env': env,
      global: {},
    },
    rollupOptions: {
      input: 'src/main.js',
      output: {
        entryFileNames: `[name].js`,
        manualChunks: {}
      }
    },
    build: {
      sourcemap: !isProd,
      rollupOptions: {
        external: [ // 排除掉，不进行预打包，外部引入
        ],
        plugins: [
          // 不打包依赖映射的对象
          externalGlobals({
          }),
          polyfillNode()
        ]
      },
      commonjsOptions: {
        transformMixedEsModules: true // require可以使用
      },
      cssCodeSplit: true
    },
    resolve: {
      extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.vue'],
      alias: [{ find: '@', replacement: '/src' }, { find: '_c', replacement: '/src/components' }]
    },
    optimizeDeps: {
      include: [ // 某些npm包导出的格式不是ESM，会报错，要在这里包含进来，vite会进行转换格式
      ]
    },
    plugins: [
      createVuePlugin(),
      requireTransform({ fileRegex: /.js$|.ts$|.tsx$|.vue$/ }),
      VuePluginHtmlEnv({ compiler: true }),
      legacy({
        targets: ['ie >= 11'],
        additionalLegacyPolyfills: ['regenerator-runtime/runtime'], // 可选
        // 下面是其他选项
        // polyfills: ['es.promise', 'es.symbol'], // 指定 polyfills
        // modernPolyfills: true, // 添加现代浏览器所需的 polyfills
        // corejs: 3, // core-js 版本号
        // debug: false, // 是否开启插件调试模式
      }),
      viteCompression({
        verbose: true,
        disable: false,
        threshold: 10240,
        algorithm: 'gzip',
        ext: '.gz'
      })
    ],
    server: {
      port: 1888,
      open: true,
      proxy: {
        '/api': {
          // 代理远程服务
          target: process.env.VUE_APP_PROXY,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '/')
        }
      }
    }
  });
};
