// ==UserScript==
// @name         xCloud Test
// @namespace    https://github.com/redphx
// @version      1.0
// @description  Test xCloud features
// @author       redphx
// @license      MIT
// @match        https://www.xbox.com/*/play*
// @run-at       document-start
// @grant        none
// ==/UserScript==
'use strict';

class Patcher {
    static #PATCHES = {
        patchStatsOverlay: function(funcStr) {
            const text = 'e.showStreamStatisticsOverlay?';
            if (!funcStr.includes(text)) {
                return false;
            }

            return funcStr.replace(text, 'true?');
        },
    };

    static #PATCH_ORDERS = [
        ['patchStatsOverlay'],
    ];

    // Only when playing
    static #PLAYING_PATCH_ORDERS = [
        
    ];

    static #patchFunctionBind() {
        const nativeBind = Function.prototype.bind;
        Function.prototype.bind = function() {
            let valid = false;
            if (this.name.length <= 2 && arguments.length === 2 && arguments[0] === null) {
                if (arguments[1] === 0 || (typeof arguments[1] === 'function')) {
                    valid = true;
                }
            }

            if (!valid) {
                return nativeBind.apply(this, arguments);
            }

            if (typeof arguments[1] === 'function') {
                console.log('[Better xCloud] Restored Function.prototype.bind()');
                Function.prototype.bind = nativeBind;
            }

            const orgFunc = this;
            const newFunc = (a, item) => {
                if (Patcher.length() === 0) {
                    orgFunc(a, item);
                    return;
                }

                Patcher.patch(item);
                orgFunc(a, item);
            }

            return nativeBind.apply(newFunc, arguments);
        };
    }

    static length() { return Patcher.#PATCH_ORDERS.length; };

    static patch(item) {
        // console.log('patch', '-----');
        let patchName;
        let appliedPatches;

        for (let id in item[1]) {
            if (Patcher.#PATCH_ORDERS.length <= 0) {
                return;
            }

            appliedPatches = [];
            const func = item[1][id];
            let funcStr = func.toString();

            for (let groupIndex = 0; groupIndex < Patcher.#PATCH_ORDERS.length; groupIndex++) {
                const group = Patcher.#PATCH_ORDERS[groupIndex];
                let modified = false;

                for (let patchIndex = 0; patchIndex < group.length; patchIndex++) {
                    const patchName = group[patchIndex];
                    if (appliedPatches.indexOf(patchName) > -1) {
                        continue;
                    }

                    const patchedFuncStr = Patcher.#PATCHES[patchName].call(null, funcStr);
                    if (!patchedFuncStr) {
                        // Only stop if the first patch is failed
                        if (patchIndex === 0) {
                            break;
                        } else {
                            continue;
                        }
                    }

                    modified = true;
                    funcStr = patchedFuncStr;

                    console.log(`[Better xCloud] Applied "${patchName}" patch`);
                    appliedPatches.push(patchName);

                    // Remove patch from group
                    group.splice(patchIndex, 1);
                    patchIndex--;
                }

                // Apply patched functions
                if (modified) {
                    item[1][id] = eval(funcStr);
                }

                // Remove empty group
                if (!group.length) {
                    Patcher.#PATCH_ORDERS.splice(groupIndex, 1);
                    groupIndex--;
                }
            }
        }
    }

    // Remove disabled patches
    static #cleanupPatches() {
        for (let groupIndex = Patcher.#PATCH_ORDERS.length - 1; groupIndex >= 0; groupIndex--) {
            const group = Patcher.#PATCH_ORDERS[groupIndex];
            if (group === false) {
                Patcher.#PATCH_ORDERS.splice(groupIndex, 1);
                continue;
            }

            for (let patchIndex = group.length - 1; patchIndex >= 0; patchIndex--) {
                const patchName = group[patchIndex];
                if (!Patcher.#PATCHES[patchName]) {
                    // Remove disabled patch
                    group.splice(patchIndex, 1);
                }
            }

            // Remove empty group
            if (!group.length) {
                Patcher.#PATCH_ORDERS.splice(groupIndex, 1);
            }
        }
    }

    static initialize() {
        if (window.location.pathname.includes('/play/')) {
            Patcher.#PATCH_ORDERS = Patcher.#PATCH_ORDERS.concat(Patcher.#PLAYING_PATCH_ORDERS);
        } else {
            Patcher.#PATCH_ORDERS.push(['loadingEndingChunks']);
        }

        Patcher.#cleanupPatches();
        Patcher.#patchFunctionBind();
    }
}

Patcher.initialize();
