import { Animatable, Animation, EasingFunction, Node, Nullable, SineEase, Vector3 } from '@babylonjs/core';
import TWEEN from '@tweenjs/tween.js';
import { get, set } from 'lodash';
import { v4 as uuid } from 'uuid';

declare module '@babylonjs/core/node' {
    export interface Node {
        transitionTo(attribute: string, targetValue: any, duration: number): Nullable<Animatable>;
        stopAnimations(): void;
    }
}

declare module "@tweenjs/tween.js" {
    export interface Tween {
        onTarget(obj: any): Tween;
        withId(id: string): Tween
    }
}

function getMany(obj: any, paths: string[]) {
    const result: any = {};

    for(let path of paths) {
        result[path] = get(obj, path);
    }

    return result;
}

function unpack(obj: any) {
    const result: any = {};

    for(let key of Object.keys(obj)) {
        const val = obj[key];
        if(val instanceof Vector3) {
            result[key + '.x'] = val.x;
            result[key + '.y'] = val.y;
            result[key + '.z'] = val.z;
        } else {
            result[key] = val;
        }
    }

    return result;
}

const SIN_IN_OUT = new SineEase();
SIN_IN_OUT.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);

export class AnimationHelper {
    static Touch() {

    }

    static TransitionTo(node: Node, attribute: string, targetValue: any, duration: number): Animatable {

        // console.log("From", getMany(node, [attribute]), "to", { [attribute]: targetValue },  duration * 1000);
        // new TWEEN.Tween(unpack(getMany(node, [attribute])))
        //     .to(unpack({ [attribute]: targetValue }), duration * 1000)
        //     .onTarget(node)
        //     .easing(TWEEN.Easing.Sinusoidal.InOut)
        //     .start();
        // return null;

        return Animation.CreateAndStartAnimation(
            uuid(),
            node,
            attribute,
            60,
            Math.round(60 * duration),
            get(node, attribute),
            targetValue,
            Animation.ANIMATIONLOOPMODE_CONSTANT,
            SIN_IN_OUT
        );
    }
}

Node.prototype.transitionTo = function(attribute: string, targetValue: any, duration: number): Nullable<Animatable> {
    return AnimationHelper.TransitionTo(this, attribute, targetValue, duration);
};

Node.prototype.stopAnimations = function(): void {
    this.getScene().stopAnimation(this);
};

TWEEN.Tween.prototype.onTarget = function(target: any): TWEEN.Tween {
    this.onUpdate((values: any) => {
        for(let path of Object.keys(values)) {
            // console.log(`${path} => ${values[path]}`)
            set(target, path, values[path]);
        }
    });
    return this;
}

const activeTweens: { [key: string]: TWEEN.Tween } = {};
TWEEN.Tween.prototype.withId = function(id: string): TWEEN.Tween {
    const self = this as TWEEN.Tween;
    if(activeTweens[id]) {
        activeTweens[id].stopChainedTweens();
        activeTweens[id].stop();
    }

    activeTweens[id] = self;
    self.onComplete(() => {
        delete activeTweens[id];
    });
    return self;
}