import { state } from './showModelState.js';

window.toggle3d = function () {
    if (state.modelIsShown) {
        state.modelIsShown = false;
        return;
    }
    state.modelIsShown = true;
}