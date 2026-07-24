export function startLoop({ ticksPerSecond, onTick, onRender }) {
    const control = { speed: 1 };
    const tickInterval = 1000 / ticksPerSecond;
    let lastTime = performance.now();
    let accumulator = 0;

    function frame(now) {
        accumulator += (now - lastTime) * control.speed;
        lastTime = now;
        while (accumulator >= tickInterval) {
            onTick();
            accumulator -= tickInterval;
        }
        onRender();
        requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
    return control;
}
