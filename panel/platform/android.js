'use strict';

exports.template = `
    <ui-prop name="API Level">
        <ui-select class="flex-1" v-value="data.apiLevel">
            <template v-for="item in apiLevels">
                <option v-bind:value="item">{{item}}</option>
            </template>
        </ui-select>
    </ui-prop>

    <ui-prop name="APP ABI" auto-height>
        <div class="flex-1 layout vertical">
            <ui-checkbox class="item" v-value="armeabi">
                armeabi
            </ui-checkbox>
            <ui-checkbox class="item" v-value="armeabiV7a">
                armeabi-v7a
            </ui-checkbox>
            <ui-checkbox class="item" v-value="arm64V8a">
                arm64-v8a
            </ui-checkbox>
            <ui-checkbox class="item" v-value="x86">
                x86
            </ui-checkbox>
        </div>
    </ui-prop>
`;

exports.props = {
    'data': null,
    'project': null
};

exports.data = function () {
    return {
        apiLevels: [],
        armeabi: true,//cjh this.data.appABIs.indexOf('armeabi') >= 0,
        armeabiV7a: true,//this.data.appABIs.indexOf('armeabi-v7a') >= 0,
        arm64V8a: true,//this.data.appABIs.indexOf('arm64-v8a') >= 0,
        x86: true//this.data.appABIs.indexOf('x86') >= 0
    };
};

exports.watch = {
    armeabi: {
        handler (val) {
            this._abiValueChanged('armeabi', val);
        }
    },
    armeabiV7a: {
        handler (val) {
            this._abiValueChanged('armeabi-v7a', val);
        }
    },
    arm64V8a: {
        handler (val) {
            this._abiValueChanged('arm64-v8a', val);
        }
    },
    x86: {
        handler (val) {
            this._abiValueChanged('x86', val);
        }
    }
};

exports.created = function () {

    Editor.log("android.js, created ...");
    Editor.Ipc.sendToMain('app:query-android-apilevels', (error, list) => {
        if (error)
            return Editor.warn(err);

        list.forEach((item) => {
            this.apiLevels.push(item);
        });

        if (!this.data) return;
        var apiLevel = this.data.apiLevel;
        if (list.length <= 0) {
            return this.data.apiLevel = '';
        }

        if (list.indexOf(apiLevel) === -1) {
            this.data.apiLevel = list[0];
        }
    });
};

exports.directives = {};

exports.methods = {
    _abiValueChanged : function (abiName, selected ) {
        Editor.log("abi changed: " + abiName + ", selected: " + selected);
        if (!this.data.appABIs) return;
        var idx = this.data.appABIs.indexOf(abiName);
        if (selected) {
            if (idx < 0) {
                this.data.appABIs.push(abiName);
            }
        } else {
            if (idx >= 0) {
                this.data.appABIs.splice(idx, 1);
            }
        }
    }
};