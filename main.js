'use strict';

const IconvLite = require('iconv-lite');

let _prebuiltProcess;

/**
 * @param  {ChildProcess}   child    child process
 * @param  {Object}   opts
 *         logToFile - whether write log to file
 *         useSystemEncoding - whether read system encoding for log
 *         prefix - log prefix
 * @param  {Function} callback - child process close callback
 */
function handleChildProcess (child, opts, callback) {
    Editor.log(`handleChildProcess`);
    let encoding = 'utf-8';
    let defaultOpts = {
        logFilePath: '',
        disableEditorLog: false,//cjh !showLogInConsole,
        useSystemEncoding: true,
        prefix: ''
    };

    if (typeof opts === 'function') {
        callback = opts;
        opts = defaultOpts;
    }
    else {
        opts = Object.assign(defaultOpts, opts);
    }

    function registerEvents () {
        let writeStream;
        if (opts.logFilePath) {
            Fs.ensureFileSync( opts.logFilePath );

            writeStream = Fs.createWriteStream(opts.logFilePath, {
                defaultEncoding: encoding
            });
        }

        child.stdout.on('data', data => {
            if (writeStream) {
                writeStream.write(data);
            }

            if (opts.disableEditorLog) {
                return;
            }

            let info;
            if (process.platform === 'win32') {
                info = IconvLite.decode(data, encoding);
            }
            else {
                info = data.toString();
            }

            if (info.length > 1) {
                info = info.replace(/\n*$/g, '');
            }

            let infos = info.split('\n');

            infos.forEach(info => {
                if (opts.prefix) {
                    info = opts.prefix + ' : ' + info;
                }

                Editor.log(info);
            });
        });
        child.stderr.on('data', data => {
            if (writeStream) {
                writeStream.write(data);
            }

            if (opts.disableEditorLog) {
                return;
            }

            let info;
            if (process.platform === 'win32') {
                info = IconvLite.decode(data, encoding);
            }
            else {
                info = data.toString();
            }

            // let infos = info.split('\n');
            // infos.forEach(info => {
                if (opts.prefix) {
                    info = opts.prefix + ' : ' + info;
                }

                if (info.indexOf('warning') !== -1) {
                    Editor.warn(info);
                }
                else {
                    Editor.failed(info);
                }
            // });
        });
        child.on('close', (code, signal) => {
            if (writeStream) {
                writeStream.close();
            }

            callback.call(child, null, code, signal);
        });
        child.on('error', function (err) {
            callback.call(child, err);
        });
    }

    //cjh if (opts.useSystemEncoding) {
    //     getSysEncoding((err, result) => {
    //         encoding = result;
    //         registerEvents();
    //     });
    //     return;
    // }

    registerEvents();
}

function compilePrebuilt(args, spawnOpts)
{
      let ret = Editor.NativeUtils.getCocosSpawnProcess(args, spawnOpts);

      if (ret.error) {
          Editor.error(ret.error);
          return;
      }
      _prebuiltProcess = ret.child;

      handleChildProcess(_prebuiltProcess, {
            logFilePath: null,//nativeLogPath,
            disableEditorLog: false,//!showLogInConsole
          },
          (err, code) => {
              if (err) {
                  Editor.error(err);
                  return;
              }

              if (code !== 0) {
                  Editor.error( new Error(`Failed compile cocos prebuilt libs.`));// The log file path [ ${nativeLogPath}]`) );
                  return;
              }

              Editor.log('Success compile cocos prebuilt libs.');
          });
}

function stopCompilePrebuilt () {
    if (_prebuiltProcess) {
        TreeKill(_prebuiltProcess.pid);
        _prebuiltProcess = null;
    }
}

module.exports = {
  load () {
    // 当 package 被正确加载的时候执行
  },

  unload () {
    // 当 package 被正确卸载的时候执行
  },

  messages: {
    'binary-creator:open' () {
      Editor.Panel.open('binary-creator');
    },
    'test' (args, spawnOpts) {
      Editor.log(`haha args:${args}`);
      compilePrebuilt(args, spawnOpts);
      // Editor.Ipc.sendToPanel('spawn-process', );
    }
  },
};