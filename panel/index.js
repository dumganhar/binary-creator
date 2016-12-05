'use strict';

var createPlatforms = function () {
    var platforms = [];
    
    if (process.platform === 'darwin') {
        platforms.push({ value: 'ios', text: 'iOS' });
        platforms.push({ value: 'mac', text: 'Mac' });
    } else if (process.platform === 'win32') {
        platforms.push({ value: 'win32', text: 'Windows' });
    }
    platforms.push({ value: 'android', text: 'Android' });
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

    Editor.log("this.profiles:" + this.profiles);

    // for (var k in this.profiles.local)
    // {
    //   Editor.log("this.profiles[" + k + ']=' + this.profiles.local[k] );
    // }
    // var profilesLocal = this.profiles.local;
    // var profilesProject = this.profiles.project;

    // Editor.log("ready 2...,data: " + profilesLocal.data);
    // var data = deepCopyObject(profilesLocal.data, {});
    // var project = deepCopyObject(profilesProject.data, {});

    // Editor.log("data:" + data);

    var vm = this._vm = new window.Vue({
      el: this.shadowRoot,
      data: {
          platforms: createPlatforms(),
          all: false,
          task: '',
          data: {platform: 'android', appABIs: ['armeabi'], apiLevel: 'android-13'},
          project: {},
          buildState: 'sleep',
          buildProgress: 0
      },

      components: {
        'android-list': AndroidList,
        'windows-list': WindowsList,
        'ios-list': IOSList,
        'mac-list': MacList
      },

      watch: {
        data: {
            handler (val) {
                Editor.log("watch, data: " + val);
                // if (!profilesLocal.save) return;
                // deepCopyObject(val, profilesLocal.data);
                // profilesLocal.save();
            },
            deep: true
        },
        project: {
            handler (val) {
                Editor.log("watch, project: " + val);
                // if (!profilesProject.save) return;
                // deepCopyObject(val, profilesProject.data);
                // profilesProject.save();
            },
            deep: true
        }
      },

      methods: {
        _onOpenCompileLogFile (event) {
            event.stopPropagation();
            // Editor.Ipc.sendToMain('app:open-cocos-console-log');
        },

        _onChooseDistPathClick (event) {
            event.stopPropagation();
            // let res = Editor.Dialog.openFile({
            //     defaultPath: buildUtils.getAbsoluteBuildPath(data.buildPath),
            //     properties: ['openDirectory']
            // });
            // if (res && res[0]) {
            //     if (Path.contains(Editor.projectInfo.path, res[0])) {
            //         this.data.buildPath = Path.relative(Editor.projectInfo.path, res[0]).replace(/\\/g, '/');
            //         if (this.data.buildPath === '') {
            //             this.data.buildPath = './';
            //         } 
            //     }
            //     else {
            //         this.data.buildPath = res[0];
            //     }
            // }
        },

        _onShowInFinderClick (event) {
            event.stopPropagation();
            // let buildPath = buildUtils.getAbsoluteBuildPath(data.buildPath);
            // if (!Fs.existsSync(buildPath)) {
            //     Editor.warn('%s not exists!', buildPath);
            //     return;
            // }
            // Electron.shell.showItemInFolder(buildPath);
            // Electron.shell.beep();
        },

        _onSelectAllCheckedChanged (event) {
            // if (!this.scenes) {
            //     return;
            // }

            // let startScene = this.project.startScene;
            // for (let i = 0; i < this.scenes.length; i++) {
            //     let item = this.scenes[i];
            //     if (
            //         item.text.startsWith('db://assets/resources/') ||
            //         startScene === item.value
            //     ) {
            //         continue;
            //     }

            //     item.checked = event.detail.value;
            //     var index = this.project.excludeScenes.indexOf(item.value);
            //     if (!item.checked && index === -1) {
            //         this.project.excludeScenes.push(item.value);
            //     } else if (item.checked && index !== -1) {
            //         this.project.excludeScenes.splice(index, 1);
            //     }
            // }
        },

        startTask (task, options) {
            // this.task = task;
            // // 将项目设置中的模块排除列表发给 Builder
            // Editor.Profile.load('profile://project/project.json', (err, profile) => {
            //     options.excludedModules = profile.data['excluded-modules'];
            //     Editor.Ipc.sendToMain('builder:start-task', task, options);
            // });
        },

        _onBuildClick (event) {
            event.stopPropagation();

            // Editor.Ipc.sendToPanel('scene', 'scene:query-dirty-state', (err, state) => {
            //     if (state.dirty) {
            //         Editor.error(state.name + ' ' + Editor.T('BUILDER.error.dirty_info'));
            //         return;
            //     }

            //     this._build();
            // });
        },

        _build () {
            // var buildPath = buildUtils.getAbsoluteBuildPath(data.buildPath);
            // var buildDir = Path.win32.dirname(buildPath);

            // if (!Fs.existsSync(buildDir)) {
            //     Editor.error(Editor.T('BUILDER.error.build_dir_not_exists', {buildDir: buildDir}));
            //     return;
            // }

            // if (buildPath.indexOf(' ') !== -1) {
            //     Editor.error(Editor.T('BUILDER.error.build_path_contains_space'));
            //     return;
            // }

            // var containsChinese = /.*[\u4e00-\u9fa5]+.*$/.test(buildPath);
            // if (containsChinese) {
            //     Editor.error(Editor.T('BUILDER.error.build_path_contains_chinese'));
            //     return;
            // }

            // // project name should be 0-9 a-z A-Z _ , android should also not include -
            // var platform = this.data.platform;
            // var regex;
            // if (platform === 'android') {
            //     regex = /^[a-zA-Z0-9_]*$/;
            // } else {
            //     regex = /^[a-zA-Z0-9_-]*$/;
            // }

            // if (!regex.test(this.project.title)) {
            //     Editor.error(Editor.T('BUILDER.error.project_name_not_legal'));
            //     return;
            // }

            // let packageName = this.project.packageName;
            // if (platform === 'ios' || platform === 'android' || platform === 'mac') {
            //     // package name should be 0-9 a-z A-Z _ - .
            //     if (platform === 'android') {
            //         regex = /^[a-zA-Z0-9_.]*$/;
            //     } else {
            //         regex = /^[a-zA-Z0-9_.-]*$/;
            //     }

            //     if (!regex.test(packageName)) {
            //         Editor.error(Editor.T('BUILDER.error.package_name_not_legal'));
            //         return;
            //     }

            //     let regions = packageName.split('.');
            //     for (let i = 0; i < regions.length; i++) {
            //         if (!isNaN(regions[i][0])) {
            //             Editor.error(Editor.T('BUILDER.error.package_name_start_with_number'));
            //             return;
            //         }
            //     }
            // }

            // Editor.Ipc.sendToAll('builder:state-changed', 'ready', 0);

            // var buildUuidList = this.scenes.filter(function (scene) {
            //     return scene.checked;
            // }).map(function (scene) {
            //     return scene.value;
            // });

            // if (buildUuidList.length > 0) {
            //     let options = buildUtils.getOptions(profilesProject, profilesLocal);
            //     options.scenes = buildUuidList;

            //     this.startTask('build', options);
            //     Editor.Ipc.sendToMain('metrics:track-event', {
            //         category: 'Project',
            //         action: 'Build',
            //         label: platform
            //     });
            // }
            // else {
            //     Editor.error(Editor.T('BUILDER.error.select_scenes_to_build'));
            // }
        },

        _onCompileClick (event) {
            event.stopPropagation();
            // this.startTask('compile', buildUtils.getOptions(profilesProject, profilesLocal));
        },

        _onStopCompileClick: function (event) {
            event.stopPropagation();
            // Editor.Ipc.sendToMain('app:stop-compile');
        },

        _onPreviewClick (event) {
            event.stopPropagation();
            // Editor.Ipc.sendToMain('app:run-project', buildUtils.getOptions(profilesProject, profilesLocal));
        }
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
  },
});