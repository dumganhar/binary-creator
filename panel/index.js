'use strict';

var createPlatforms = function () {
    var platforms = [];
    platforms.push({ value: 'android', text: 'Android' });
    if (process.platform === 'darwin') {
        platforms.push({ value: 'ios', text: 'iOS' });
        platforms.push({ value: 'mac', text: 'Mac' });
    } else if (process.platform === 'win32') {
        platforms.push({ value: 'win32', text: 'Windows' });
    }
    return platforms;
};

var deepCopyObject = function (source, dist, excludes) {
    dist = dist || {};
    var keys = Object.keys(source);
    keys.forEach((key) => {
        if (excludes && excludes.indexOf(key) !== -1) return;
        var item = source[key];
        if (typeof item === 'object' && !Array.isArray(item)) {
            dist[key] = deepCopyObject(item);
        } else {
            dist[key] = item;
        }
    });

    return dist;
};

const AndroidList = require(Editor.url('packages://binary-creator/panel/platform/android'));
const WindowsList = require(Editor.url('packages://binary-creator/panel/platform/windows'));
const IOSList = require(Editor.url('packages://binary-creator/panel/platform/ios'));
const MacList = require(Editor.url('packages://binary-creator/panel/platform/mac'));

Editor.log("AndroidList:" + AndroidList);

// for (var k in AndroidList)
// {
//   Editor.log("[" + k + "]=" + AndroidList[k]);
// }

var style = `
    :host {
        display: flex;
        flex-direction: column;
    }
    
    h2 {
        margin: 20px 20px 0 20px;
        font-size: 26px;
        color: #DDD;
    }
    
    header {
        height: 26px;
        display: flex;
        margin: 0 20px;
        padding: 15px 0;
        border-bottom: 1px solid #666;
    }
    
    .progress {
        flex: 14;
        margin: 3px 15px 3px 0;
        position: relative;
    }
    .progress ui-progress {
        width: 100%;
    }
    
    .state {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        line-height: 16px;
        margin: 0 15px 0 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        text-align: center;
        color: white;
    }
    
    .state[state=failed] {
        color: red;
    }
    
    section {
        margin: 10px 10px;
        padding: 0 10px;
        flex: 1;
        overflow-y: auto;
    }

    .fix-width {
        width: 1px;
    }
    
    .height-limited {
        max-height: 240px;
    }
    
    .height-limited ui-box-container {
        max-height: 228px;
        min-height: 100px;
    }
    
    ui-box-container li {
        margin: 4px 0;
    }
    
    ui-box-container li .fa.fa-star {
        color: yellow;
    }
    
    footer {
        padding: 10px 0;
        justify-content: flex-end;
    }
`;

var template = `
  <h2>生成Native平台预编译库</h2>

  <header>
      <div class="progress">
          <ui-progress
              class="blue small"
              v-value="buildProgress"
          ></ui-progress>
          <div class="state" v-bind:state="buildState">
              <span>{{buildState}}</span>
          </div>
      </div>
  </header>

  <section>
    <ui-prop name="请选择平台">
        <ui-select class="flex-1" v-value="data.platform">
            <template v-for="item in platforms">
                <option v-value="item.value">{{item.text}}</option>
            </template>
        </ui-select>
    </ui-prop>

    <!-- platform -->
    <android-list 
         v-if="data.platform==='android'"
         v-bind:data="data"
         v-bind:project="project"
     ></android-list>
    
    <windows-list
        v-if="data.platform==='win32'"
        v-bind:data="data"
        v-bind:project="project"
    ></windows-list>
    
    <ios-list
        v-if="data.platform==='ios'"
        v-bind:data="data"
        v-bind:project="project"
    ></ios-list>
    
    <mac-list
        v-if="data.platform==='mac'"
        v-bind:data="data"
        v-bind:project="project"
    ></mac-list>
  </section>
`;

Editor.Panel.extend({
  style: style,
  template: template,

  messages: {
    'builder:state-changed': function (event, state, progress) {
        if (!this._vm) return;
        progress *= 100;

        if (state === 'error') {
            this._vm.buildProgress = progress;
            this._vm.buildState = 'failed';
            this._vm.task = '';
            return;
        }

        if (state === 'finish') {
            this._vm.buildProgress = 100;
            this._vm.buildState = 'sleep';
            this._vm.task = '';
            return;
        }

        this._vm.buildProgress = progress;
        this._vm.buildState = state;
    },
  },

  ready () {
    Editor.log("ready...");

    var profilesLocal = this.profiles.local;
    var profilesProject = this.profiles.project;

    Editor.log("ready 2...,data: " + profilesLocal.data);
    var data = deepCopyObject(profilesLocal.data, {});
    var project = deepCopyObject(profilesProject.data, {});

    Editor.log("data:" + data);

    var vm = this._vm = new window.Vue({
      el: this.shadowRoot,
      data: {
          platforms: createPlatforms(),
          all: false,
          task: '',
          data: data,
          project: project,
          buildState: 'sleep',
          buildProgress: 0
      },

      components: {
        'android-list': AndroidList,
        'windows-list': WindowsList,
        'ios-list': IOSList,
        'mac-list': MacList
      }
    });

    Editor.log("test");

    // 查询当前的任务状态，并初始化 vue 内绑定的各个数据
    Editor.Ipc.sendToMain('builder:query-current-state', (error, result) => {
        if (error)
            return Editor.warn(error);

        this.task = result.task;
        Editor.Ipc.sendToAll('builder:state-changed', result.state, result.progress);
    });

    Editor.log("platforms size=" + vm.data.platforms.length);
      // for (var k in this._vm.data.platforms)
      // {
      //   Editor.log("[" + k + "]=" + data.platforms[k]);
      // }
  },
});