import './bootstrap';
import '../css/app.css';

import { createRoot } from 'react-dom/client';
import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { Toaster } from "@/components/ui/toaster"
import { TooltipProvider } from '@/components/ui/tooltip'
import { fixPointerEventsGlobally } from './hooks/pointer-fix'

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
    title: () => `${appName}`,
    resolve: (name) => resolvePageComponent(`./Pages/${name}.tsx`, import.meta.glob('./Pages/**/*.tsx')),
    setup({ el, App, props }) {
        const root = createRoot(el);

        document.documentElement.classList.add('dark');

        root.render(
            <>
                <TooltipProvider>
                    <App {...props} />
                </TooltipProvider>
                <Toaster />
            </>
        );

        fixPointerEventsGlobally()
    },
    progress: {
        color: '#4B5563',
    },
});
