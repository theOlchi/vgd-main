import { reactive } from 'vue';

export const state = reactive({
    FLIGHT1DATA: false,
    FLIGHT2DATA: false,
    maps1: false,
    maps2: false,
    maps3: false
});

export const stateKeys = Object.keys(state);