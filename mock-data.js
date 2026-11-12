/* Presentation-only data provider. All positions, amplitudes and times are synthetic. */
(function () {
  'use strict';
  const tasks = [
    { id: 'passive', label: 'Passive', subtitle: 'Listen', color: '#397d58', dash: '2 3', shift: [-5, -3] },
    { id: 'decision', label: 'Decision', subtitle: 'Button press', color: '#a9373b', dash: '8 3', shift: [4, 2] },
    { id: 'repeat', label: 'Repetition', subtitle: 'Speak', color: '#2369bd', dash: '', shift: [0, 0] }
  ];
  const regions = {
    st: { label: 'Superior temporal', x: 209, y: 151, rx: 39, ry: 18 },
    ventral: { label: 'Ventral', x: 211, y: 186, rx: 30, ry: 12 },
    frontal: { label: 'Frontal', x: 99, y: 119, rx: 25, ry: 27 }
  };
  const pulse = (t, center, spread) => Math.exp(-0.5 * ((t - center) / spread) ** 2);
  function signal(task, roi, t, metric) {
    const active = task !== 'passive';
    const factor = task === 'decision' ? 0.93 : task === 'repeat' ? 1 : 0.84;
    if (metric === 'activation') {
      if (roi === 'st') return factor * (0.78 * pulse(t, 280, 155) + 0.55 * pulse(t, 730, 210));
      if (roi === 'ventral') return (active ? 0.8 : 0.15) * pulse(t, 485, 175) * factor;
      return (active ? 0.88 : 0.09) * pulse(t, 815, 220) * factor;
    }
    if (roi === 'st') return factor * (0.83 * pulse(t, 440, 135) + (active ? 0.68 : 0.07) * pulse(t, 850, 150));
    if (roi === 'ventral') return -(active ? 0.85 : 0.07) * pulse(t, 490, 145) * factor;
    return factor * ((active ? -0.7 : -0.04) * pulse(t, 470, 140) + (active ? 0.88 : 0.05) * pulse(t, 860, 170));
  }
  function fields(taskId, t, metric) {
    const task = tasks.find(item => item.id === taskId);
    return Object.entries(regions).map(([id, region]) => ({
      id, ...region, x: region.x + task.shift[0], y: region.y + task.shift[1],
      value: signal(taskId, id, t, metric)
    }));
  }
  window.LexicalData = Object.freeze({
    kind: 'synthetic', version: 1, tasks, regions, signal, fields,
    timeline: Object.freeze({ min: -200, max: 1200, step: 10, illustrativeOffset: 600 }),
    displayThreshold: 0.27,
    provenance: 'Analytic demo pulses on an authored schematic. No participant data or statistical inference.'
  });
}());
