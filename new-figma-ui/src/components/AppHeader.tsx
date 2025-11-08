import { SidebarTrigger } from './ui/sidebar';
import { Separator } from './ui/separator';

interface AppHeaderProps {
  title?: string;
}

export function AppHeader({ title }: AppHeaderProps) {
  return (
    <header 
      className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b px-6 bg-white/95"
      style={{
        borderColor: 'var(--border-color-regular)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
    >
      <SidebarTrigger className="mt-[0px] mr-[6px] mb-[0px]" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      {title && (
        <h1 
          className="text-base"
          style={{ 
            color: 'var(--c-texPri)',
            fontWeight: 600
          }}
        >
          {title}
        </h1>
      )}
    </header>
  );
}
