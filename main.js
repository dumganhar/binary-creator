'use strict';

module.exports = {
  load () {
    // 当 package 被正确加载的时候执行
  },

  unload () {
    // 当 package 被正确卸载的时候执行
  },

  messages: {
    'my-package:open' () {
      Editor.log('my-package:open');
      Editor.Panel.open('binary-creator');
    }
  },
};