import * as Shox from "https://cdn.jsdelivr.net/npm/shox@1.2.0/src/Shox.js"

export const BLUR = `#version 300 es
	precision highp float;

	uniform sampler2D tex0;
	uniform vec2 texelSize;
	uniform vec2 direction;
	// uniform変数を追加
	uniform float u_blurSpread;

	${Shox.blur(3)}

	in vec2 vTexCoord;
	out vec4 fragColor;
	void main() { 
		// texelSizeに係数を掛けて、ぼかしの広がりを調整
		fragColor = blur(vTexCoord, tex0, texelSize * u_blurSpread, direction); 
	}
`

export const UNSHARP = `#version 300 es
	precision mediump float;

	uniform sampler2D tex0;
	uniform vec2 texelSize;
	// uniform変数を2つ追加
	uniform float u_unsharpRadius;
	uniform float u_unsharpAmount;

	${Shox.unsharp}

	in vec2 vTexCoord;
	out vec4 fragColor;
	void main() { 
		// ハードコードされていた数値をuniform変数に置き換え
		fragColor = unsharp(vTexCoord, tex0, texelSize * u_unsharpRadius, u_unsharpAmount); 
	}
`

export const VERT = `#version 300 es

	in vec4 aPosition;
	in vec2 aTexCoord;

	out vec2 vTexCoord;

	void main() {
		vTexCoord = aTexCoord;
		gl_Position = aPosition;
	}
`