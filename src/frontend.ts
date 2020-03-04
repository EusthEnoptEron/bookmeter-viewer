import { MainController } from './presentation/MainController';

new MainController(
    document.querySelector('#id-input'),
    document.querySelector('button'),
    document.querySelector('#render-target')
);