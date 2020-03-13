import { MainController } from './presentation/MainController';
import { template } from 'lodash';

new MainController(
    document.querySelector('#id-input'),
    document.querySelector('button'),
    document.querySelector('#render-target'),
    document.querySelector('#outline-container'),
    template(document.querySelector('#outline-template').textContent),
    document.querySelector('.error')
);