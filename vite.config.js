import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
    plugins: [
        laravel({
            input: [
                'resources/css/app.css',
                'resources/js/app.js',
                // Simulation islands. Only pages that render a simulation load
                // these; the 3D scene inside is a further lazy chunk.
                'resources/css/simulations/labs.css',
                'resources/js/simulations/resistor/index.tsx',
                'resources/js/simulations/circuit/index.tsx',
                // Landing page hero: a tiny vanilla entry that lazy-loads the 3D hero.
                'resources/js/simulations/resistor/landing.ts',
            ],
            refresh: true,
        }),
        react(),
        tailwindcss(),
    ],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./resources/js/simulations', import.meta.url)),
        },
    },
    build: {
        // The 3D chunk is large by nature (three.js + drei) and is only fetched
        // on the 3D stage; see docs/SIMULATIONS.md for the budget.
        chunkSizeWarningLimit: 1600,
        rollupOptions: {
            output: {
                // Several entries share code: the lab (index.tsx), the landing hero
                // (landing.ts → hero/mountHero) and the lazy 3D stage. Without
                // explicit shared chunks Rollup parks the shared store inside the
                // lab's entry chunk, so the landing page would download the whole
                // lab UI just to reach it. Keep the shared pieces separate:
                //  - react-vendor: React and the store library
                //  - lab-lib: the pure maths, config and capability check. Imports
                //    neither React nor three.js, so the landing entry can use it
                //    without downloading either.
                //  - lab-react: the store and pointer hook, shared by the lab and
                //    the 3D stage. Needs React, must not import three.js.
                manualChunks(id) {
                    const path = id.replace(/\\/g, '/');
                    if (/\/node_modules\/(react|react-dom|scheduler|zustand|clsx)\//.test(path)) {
                        return 'react-vendor';
                    }
                    // Used by the lab's UI and by the 3D camera rig, so it cannot live in either.
                    if (/\/node_modules\/(gsap|@gsap)\//.test(path)) {
                        return 'gsap-vendor';
                    }
                    if (/\/simulations\/resistor\/lib\/(resistor|experience|config|capabilities|sceneState|meter|checkpoints)\.ts$/.test(path)) {
                        return 'lab-lib';
                    }
                    if (/\/simulations\/resistor\/(store\.ts|hooks\/usePointerControls\.ts)$/.test(path)) {
                        return 'lab-react';
                    }
                    return undefined;
                },
            },
        },
    },
    server: {
        watch: {
            ignored: ['**/storage/framework/views/**'],
        },
    },
});
