import { Engine, Nullable, EngineOptions, Effect, EffectFallbacks } from '@babylonjs/core';

export class CustomEngine extends Engine {
    /**
     * Creates a new engine
     * @param canvasOrContext defines the canvas or WebGL context to use for rendering. If you provide a WebGL context, Babylon.js will not hook events on the canvas (like pointers, keyboards, etc...) so no event observables will be available. This is mostly used when Babylon.js is used as a plugin on a system which alreay used the WebGL context
     * @param antialias defines enable antialiasing (default: false)
     * @param options defines further options to be sent to the getContext() function
     * @param adaptToDeviceRatio defines whether to adapt to the device's viewport characteristics (default: false)
     */
    constructor(canvasOrContext: Nullable<HTMLCanvasElement | WebGLRenderingContext>, antialias?: boolean, options?: EngineOptions, adaptToDeviceRatio?: boolean) {
        super(canvasOrContext, antialias, options, adaptToDeviceRatio);
    }

    public createEffect(baseName: any, attributesNamesOrOptions: string[] | any, uniformsNamesOrEngine: string[] | Engine, samplers?: string[], defines?: string, fallbacks?: EffectFallbacks,
        onCompiled?: (effect: Effect) => void, onError?: (effect: Effect, errors: string) => void, indexParameters?: any): Effect {
        if(typeof(baseName) == 'string' && (baseName as string).indexOf('custom') >= 0) {
            attributesNamesOrOptions.attributes.push('_uvOffset', '_uvScale');
        }

        return super.createEffect(baseName, attributesNamesOrOptions, uniformsNamesOrEngine, samplers, defines, fallbacks, onCompiled, onError, indexParameters);
    }
}