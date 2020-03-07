import { Nullable, Animatable, Animation, Node } from '@babylonjs/core';
import { v4 as uuid } from 'uuid';
import { get } from 'lodash';

declare module '@babylonjs/core/node' {
    export interface Node {
        transitionTo(attribute: string, targetValue: any, duration: number): Nullable<Animatable>;
        stopAnimations(): void;
    }
}

export class AnimationHelper {
    static Touch() {

    }

    static TransitionTo(node: Node, attribute: string, targetValue: any, duration: number): Animatable {
        return Animation.CreateAndStartAnimation(
            uuid(),
            node,
            attribute,
            60,
            Math.round(60 * duration),
            get(node, attribute),
            targetValue,
            Animation.ANIMATIONLOOPMODE_CONSTANT
        );
    }
}

Node.prototype.transitionTo = function(attribute: string, targetValue: any, duration: number): Nullable<Animatable> {
    return AnimationHelper.TransitionTo(this, attribute, targetValue, duration);
};

Node.prototype.stopAnimations = function(): void {
    this.getScene().stopAnimation(this);
};