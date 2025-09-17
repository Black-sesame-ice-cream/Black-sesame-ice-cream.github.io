// Reaction-Diffusion © 2024-05-15 by Zaron Chen is licensed under the MIT License. See LICENSE for more details.
//
// Interaction
// - Mouse Drag: Interact with the canvas by dragging the mouse
// - Space Bar: Toggle play/pause for the simulation
// - Number keys (1-9): When paused, advance simulation by that many frames
// - Number key (0): When paused, advance simulation by 10 frames
// - b key: Toggle the CURSOR color between white and black
// - c key: Clear the canvas to white
// - r key: Place random black points on the canvas (pauses simulation)
// - t key: Submit the text from the GUI (pauses simulation)
// - s key: Save the current frame as a PNG image
//
// References
// The implementation is based on these videos:
// - noones img - Reaction-diffusion in 20 seconds (Touchdesginer tutorial): https://www.youtube.com/watch?v=CzmRMKQBMSw
// - ArtOfSoulburn - Reaction Diffusion In Photoshop: https://www.youtube.com/watch?v=I6Vh_NOy70M
// - SkyBase - Tutorial: Reaction-Diffusion in Photoshop: https://vimeo.com/61154654

import { BLUR, UNSHARP, VERT } from "./shader.js";
import { GUI } from 'https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm';

p5.disableFriendlyErrors = true;

const FONT_MINCHO = "'Hiragino Mincho ProN', 'MS PMincho', serif";
const FONT_GOTHIC = "'Hiragino Kaku Gothic ProN', 'Meiryo', sans-serif";

// ▼▼▼▼▼ 変更箇所 ▼▼▼▼▼
// ページのリロード後も設定を記憶するため、sessionStorageを利用
const savedResolution = parseInt(sessionStorage.getItem('rd-resolution')) || 300;
// ▲▲▲▲▲ 変更箇所 ▲▲▲▲▲

new p5((p) => {
	const [WIDTH, HEIGHT] = [savedResolution, savedResolution];
	const DISPLAY_SIZE = 600;
	const PIXEL_DENSITY = 1;
	const TEXEL_SIZE = [1 / (WIDTH * PIXEL_DENSITY), 1 / (HEIGHT * PIXEL_DENSITY)];
	const RENDERER = p.WEBGL;
	const MIN_SIDE = p.min(WIDTH, HEIGHT);
	// ▼▼▼▼▼ 変更箇所 ▼▼▼▼▼
	// 解像度に応じてGUIの値をスケーリングするための係数
	const uiScale = WIDTH / 600;
	// ▲▲▲▲▲ 変更箇所 ▲▲▲▲▲

	let cnv, gfx, img;
	let BlurPass, UnsharpPass;
	let textBuffer;
	let CURSOR_COLOR = 255;
	let TEXT_FILL_COLOR = 255;
	let TEXT_STROKE_COLOR = 0;
	let isLooping = true;

	let statusDisplayController;
	let cursorColorDisplayController;
	let textFillColorDisplayController;
	let textStrokeColorDisplayController;
	let fontDisplayController;

	const performActionAndBlur = (action) => {
		action();
		if (document.activeElement) {
			document.activeElement.blur();
		}
	};

	const updateCursorColor = () => {
		CURSOR_COLOR = 255 - CURSOR_COLOR;
		controls.currentCursorColor = (CURSOR_COLOR === 255) ? 'White' : 'Black';
		if (cursorColorDisplayController) {
			cursorColorDisplayController.updateDisplay();
		}
	};

	const updateTextColors = () => {
		TEXT_FILL_COLOR = 255 - TEXT_FILL_COLOR;
		TEXT_STROKE_COLOR = 255 - TEXT_FILL_COLOR;
		controls.currentTextFillColor = (TEXT_FILL_COLOR === 255) ? 'White' : 'Black';
		controls.currentTextStrokeColor = (TEXT_STROKE_COLOR === 255) ? 'White' : 'Black';
		if (textFillColorDisplayController) {
			textFillColorDisplayController.updateDisplay();
		}
		if (textStrokeColorDisplayController) {
			textStrokeColorDisplayController.updateDisplay();
		}
	};

	const updateFont = () => {
		controls.fontName = (controls.fontName === 'Mincho') ? 'Gothic' : 'Mincho';
		if (fontDisplayController) {
			fontDisplayController.updateDisplay();
		}
	};

	const pauseSimulation = () => {
		if (isLooping) {
			isLooping = false;
			controls.simulationStatus = 'Paused';
			if (statusDisplayController) {
				statusDisplayController.updateDisplay();
			}
		}
	};

	const controls = {
		// ▼▼▼▼▼ 変更箇所 ▼▼▼▼▼
		resolution: WIDTH,
		// ▲▲▲▲▲ 変更箇所 ▲▲▲▲▲
		simulationStatus: 'Running',
		cursorRadius: MIN_SIDE / 6,
		toggleCursorColor: () => performActionAndBlur(updateCursorColor),
		currentCursorColor: 'White',
		textInput: '模様',
		// ▼▼▼▼▼ 変更箇所 (UIスケールを適用) ▼▼▼▼▼
		textSize: 250 * uiScale,
		textWeight: 0,
		outlineWeight: 15 * uiScale,
		// ▲▲▲▲▲ 変更箇所 ▲▲▲▲▲
		toggleTextColors: () => performActionAndBlur(updateTextColors),
		currentTextFillColor: 'White',
		currentTextStrokeColor: 'Black',
		fontName: 'Mincho',
		toggleFont: () => performActionAndBlur(updateFont),
		randomPointCount: 50,
		randomPointSize: 50,
		blurSpread: 1.0,
		unsharpRadius: 3.5,
		unsharpRadius_GUI: 3.5,
		unsharpAmount: 64.0,
		submitText: () => {
			performActionAndBlur(() => {
				textBuffer.clear();
				textBuffer.push();
				const currentFont = (controls.fontName === 'Mincho') ? FONT_MINCHO : FONT_GOTHIC;
				textBuffer.textFont(currentFont);
				textBuffer.textSize(controls.textSize);
				textBuffer.textAlign(p.CENTER, p.CENTER);
				textBuffer.textLeading(controls.textSize / 2);
				const formattedText = controls.textInput.replace(/\//g, '\n');
				textBuffer.strokeWeight(controls.outlineWeight);
				textBuffer.stroke(TEXT_STROKE_COLOR);
				textBuffer.fill(TEXT_STROKE_COLOR);
				textBuffer.text(formattedText, WIDTH / 2, HEIGHT / 2);
				textBuffer.strokeWeight(controls.textWeight);
				textBuffer.stroke(TEXT_FILL_COLOR);
				textBuffer.fill(TEXT_FILL_COLOR);
				textBuffer.text(formattedText, WIDTH / 2, HEIGHT / 2);
				textBuffer.pop();
				p.push();
				p.image(textBuffer, 0, 0);
				p.pop();
			});
		}
	};

	p.preload = () => (img = p.loadImage("NoiseMono_2.png"));

	p.setup = () => {
		cnv = p.createCanvas(WIDTH, HEIGHT, RENDERER);
		cnv.parent('canvas-container');
		p.pixelDensity(PIXEL_DENSITY);
		gfx = p.createGraphics(WIDTH, HEIGHT, p.WEBGL);
		textBuffer = p.createGraphics(WIDTH, HEIGHT);
		BlurPass = p.createShader(VERT, BLUR);
		UnsharpPass = p.createShader(VERT, UNSHARP);
		RENDERER === p.WEBGL && p.rectMode(p.CENTER);
		RENDERER === p.WEBGL && p.imageMode(p.CENTER);
		p.background(0);
		p.noStroke();
		gfx.noStroke();
		
		const gui = new GUI();
		// ▼▼▼▼▼ 変更箇所 ▼▼▼▼▼
		const perfFolder = gui.addFolder('Quality & Performance');
		perfFolder.add(controls, 'resolution', [100, 200, 300, 400, 500, 600])
			.name('Processing Resolution')
			.onFinishChange(value => {
				sessionStorage.setItem('rd-resolution', value);
				window.location.reload();
			});
		// ▲▲▲▲▲ 変更箇所 ▲▲▲▲▲

		statusDisplayController = gui.add(controls, 'simulationStatus').name('Status').disable();
		const cursorFolder = gui.addFolder('Cursor');
		cursorFolder.add(controls, 'cursorRadius', 10, 150 * uiScale, 1).name('Radius');
		cursorFolder.add(controls, 'toggleCursorColor').name('Toggle Color');
		cursorColorDisplayController = cursorFolder.add(controls, 'currentCursorColor').name('Current Color').disable();
		const textFolder = gui.addFolder('Text');
		textFolder.add(controls, 'textInput').name('Content (use / for newline)');
		textFolder.add(controls, 'textSize', 100 * uiScale, 500 * uiScale, 1).name('Size');
		textFolder.add(controls, 'textWeight', 0, 30 * uiScale, 0.5).name('Weight');
		textFolder.add(controls, 'outlineWeight', 0, 30 * uiScale, 0.5).name('Outline Weight');
		textFolder.add(controls, 'toggleTextColors').name('Toggle Text Colors');
		textFillColorDisplayController = textFolder.add(controls, 'currentTextFillColor').name('Fill Color').disable();
		textStrokeColorDisplayController = textFolder.add(controls, 'currentTextStrokeColor').name('Stroke Color').disable();
		textFolder.add(controls, 'toggleFont').name('Toggle Font');
		fontDisplayController = textFolder.add(controls, 'fontName').name('Current Font').disable();
		textFolder.add(controls, 'submitText').name('Submit Text');
		const patternFolder = gui.addFolder('Pattern Controls');
		patternFolder.add(controls, 'unsharpRadius_GUI', 1, 20, 0.5)
			.name('Pattern Scale (Radius)')
			.onFinishChange(value => {
				controls.unsharpRadius = value;
			});
		const pointsFolder = gui.addFolder('Random Points (R key)');
		pointsFolder.add(controls, 'randomPointCount', 1, 100, 1).name('Count');
		pointsFolder.add(controls, 'randomPointSize', 10, 100, 1).name('Size');
		p.image(img, 0, 0, WIDTH, HEIGHT);
		for (let _ = 0; _ < 3; _++) p.draw();
	};

	p.draw = () => {
		const lastFrame = p.get();
		if (isLooping) {
			ReactionDiffusion(lastFrame);
		}
		Cursor();
		Border();
	};

	p.keyPressed = () => {
		if (document.activeElement.type === "text") return;
		if (p.key === " ") {
			isLooping = !isLooping;
			controls.simulationStatus = isLooping ? 'Running' : 'Paused';
			if (statusDisplayController) {
				statusDisplayController.updateDisplay();
			}
		}
		if (p.key === "b") {
			updateCursorColor();
		}
		if (p.key === "c") {
			p.background(255);
		}
		if (p.key === "r") {
			pauseSimulation();
			p.push();
			p.translate(-WIDTH / 2, -HEIGHT / 2);
			p.fill(0);
			p.noStroke();
			for (let i = 0; i < controls.randomPointCount; i++) {
				const x = p.random(WIDTH);
				const y = p.random(HEIGHT);
				p.circle(x, y, controls.randomPointSize);
			}
			p.pop();
		}
		if (p.key === "t") {
			pauseSimulation();
			controls.submitText();
		}
		if (p.key === "s") {
			const timestamp = `${p.year()}-${p.month()}-${p.day()}_${p.hour()}-${p.minute()}-${p.second()}`;
			p.saveCanvas(`reaction-diffusion_${timestamp}`, 'png');
		}

		const num = parseInt(p.key);
		if (!isNaN(num) && num >= 0 && num <= 9) {
			if (!isLooping) {
				const framesToProcess = (num === 0) ? 10 : num;
				for (let i = 0; i < framesToProcess; i++) {
					const lastFrame = p.get();
					ReactionDiffusion(lastFrame);
					Cursor();
					Border();
				}
			}
		}
	};

	const Cursor = () => {
		p.push();
		p.translate(-WIDTH / 2, -HEIGHT / 2);
		p.fill(CURSOR_COLOR);
		if (p.mouseIsPressed) {
			p.circle(p.mouseX, p.mouseY, controls.cursorRadius);
		}
		p.pop();
	};

	const Border = () => {
		p.push();
		p.noFill();
		p.stroke(255);
		p.strokeWeight(MIN_SIDE / 24);
		p.rect(0, 0, WIDTH, HEIGHT);
		p.pop();
	};

	const ReactionDiffusion = (inputTexture) => {
		BlurPass.setUniform("u_blurSpread", controls.blurSpread);
		UnsharpPass.setUniform("u_unsharpRadius", controls.unsharpRadius);
		UnsharpPass.setUniform("u_unsharpAmount", controls.unsharpAmount);
		gfx.shader(BlurPass);
		BlurPass.setUniform("texelSize", TEXEL_SIZE);
		BlurPass.setUniform("tex0", inputTexture);
		BlurPass.setUniform("direction", [1, 0]);
		gfx.quad(-1, 1, 1, 1, 1, -1, -1, -1);
		gfx.shader(BlurPass);
		BlurPass.setUniform("texelSize", TEXEL_SIZE);
		BlurPass.setUniform("tex0", gfx);
		BlurPass.setUniform("direction", [0, 1]);
		gfx.quad(-1, 1, 1, 1, 1, -1, -1, -1);
		gfx.shader(UnsharpPass);
		UnsharpPass.setUniform("texelSize", TEXEL_SIZE);
		UnsharpPass.setUniform("tex0", gfx);
		gfx.quad(-1, 1, 1, 1, 1, -1, -1, -1);
		p.image(gfx, 0, 0);
	};
});