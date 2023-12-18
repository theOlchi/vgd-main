import { state } from './showModelState.js';

window.toggle3d = function (id) {
    if (!state[id]) {
        state[id] = false;
    }
    state[id] = !state[id];
}