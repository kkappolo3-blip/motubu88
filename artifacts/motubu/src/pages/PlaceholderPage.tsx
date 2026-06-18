import { Clock } from "lucide-react";

interface PlaceholderPageProps {
  title: string;
}

export default function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <Clock className="w-8 h-8 text-muted-foreground/50" />
      </div>
      <h2 className="text-xl font-bold text-foreground mb-2">{title}</h2>
      <p className="text-muted-foreground text-sm max-w-xs">
        Fitur ini sedang dalam pengembangan dan akan segera tersedia. Pantau terus pembaruan MOTUBU.
      </p>
      <div className="mt-4 inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-medium px-4 py-2 rounded-full">
        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        Segera Hadir
      </div>
    </div>
  );
}
