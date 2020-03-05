import { PBRCustomMaterial } from "@babylonjs/materials/custom/pbrCustomMaterial";
import { Scene } from "@babylonjs/core";

export class PBRScalableMaterial extends PBRCustomMaterial {
    static ScaleKind: string = "_uvScale";
    static OffsetKind: string = "_uvOffset";

    constructor(name: string, scene: Scene) {
        super(name, scene);

        this.Vertex_Begin(`
            #ifdef INSTANCES
                attribute vec2 ${PBRScalableMaterial.ScaleKind};
                attribute vec2 ${PBRScalableMaterial.OffsetKind};
            #else
                uniform vec2 ${PBRScalableMaterial.ScaleKind};
                uniform vec2 ${PBRScalableMaterial.OffsetKind};
            #endif
        `);

        this.Vertex_Before_PositionUpdated(`
            uvUpdated = (uvUpdated * ${PBRScalableMaterial.ScaleKind}) + ${PBRScalableMaterial.OffsetKind};
        `);
    }
}
