import { useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { getSpaceColor } from './AgendaSidebar';
import type { Tables } from '@/integrations/supabase/types';
import { MapPin } from 'lucide-react';

type Space = Tables<'spaces'> & {
  category?: Tables<'categories'> | null;
};

interface SpaceFilterHeaderProps {
  spaces: Space[];
  primarySpaceId: string | null;
  onPrimarySpaceChange: (spaceId: string) => void;
  visibleSpaceIds: string[];
  onSpaceVisibilityToggle: (spaceId: string) => void;
}

export function SpaceFilterHeader({
  spaces,
  primarySpaceId,
  onPrimarySpaceChange,
  visibleSpaceIds,
  onSpaceVisibilityToggle,
}: SpaceFilterHeaderProps) {
  // Group spaces by category for the dropdown
  const groupedSpaces = useMemo(() => {
    const groups: Record<string, Space[]> = {};
    const uncategorized: Space[] = [];
    
    spaces.forEach((space) => {
      if (space.category?.name) {
        if (!groups[space.category.name]) {
          groups[space.category.name] = [];
        }
        groups[space.category.name].push(space);
      } else {
        uncategorized.push(space);
      }
    });
    
    return { groups, uncategorized };
  }, [spaces]);

  const selectedSpace = spaces.find((s) => s.id === primarySpaceId);

  return (
    <div className="flex flex-wrap items-center gap-2 md:gap-3 bg-card rounded-lg p-2 md:p-3 shadow-soft border border-border">
      {/* Primary Space Selector */}
      <div className="flex items-center gap-2">
        <Label className="text-xs md:text-sm font-medium text-muted-foreground whitespace-nowrap">
          <MapPin className="h-3.5 w-3.5 md:h-4 md:w-4 inline mr-1" />
          Espaço Ativo:
        </Label>
        <Select
          value={primarySpaceId || undefined}
          onValueChange={onPrimarySpaceChange}
        >
          <SelectTrigger className="w-[140px] md:w-[180px] h-8 md:h-9 text-xs md:text-sm">
            <SelectValue placeholder="Selecione..." />
          </SelectTrigger>
          <SelectContent className="z-50 bg-popover">
            {/* Uncategorized spaces */}
            {groupedSpaces.uncategorized.map((space) => {
              const spaceIndex = spaces.findIndex((s) => s.id === space.id);
              const colors = getSpaceColor(spaceIndex);
              return (
                <SelectItem key={space.id} value={space.id}>
                  <div className="flex items-center gap-2">
                    <div className={cn('w-2 h-2 rounded-full', colors.dot)} />
                    <span>{space.name}</span>
                  </div>
                </SelectItem>
              );
            })}
            
            {/* Grouped spaces by category */}
            {Object.entries(groupedSpaces.groups).map(([categoryName, categorySpaces]) => (
              <div key={categoryName}>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                  {categoryName}
                </div>
                {categorySpaces.map((space) => {
                  const spaceIndex = spaces.findIndex((s) => s.id === space.id);
                  const colors = getSpaceColor(spaceIndex);
                  return (
                    <SelectItem key={space.id} value={space.id}>
                      <div className="flex items-center gap-2">
                        <div className={cn('w-2 h-2 rounded-full', colors.dot)} />
                        <span>{space.name}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </div>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Divider */}
      <div className="hidden sm:block h-6 w-px bg-border" />

      {/* Space Visibility Toggles */}
      <div className="flex items-center gap-1 md:gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground mr-1 hidden md:inline">Exibir:</span>
        {spaces.map((space) => {
          const spaceIndex = spaces.findIndex((s) => s.id === space.id);
          const colors = getSpaceColor(spaceIndex);
          const isVisible = visibleSpaceIds.includes(space.id);
          const isPrimary = space.id === primarySpaceId;

          return (
            <div
              key={space.id}
              className={cn(
                'flex items-center gap-1.5 px-2 py-1 rounded-md cursor-pointer transition-all duration-200',
                'border',
                isVisible 
                  ? 'bg-muted/50 border-border' 
                  : 'bg-transparent border-transparent opacity-60 hover:opacity-100',
                isPrimary && 'ring-2 ring-primary/50'
              )}
              onClick={() => onSpaceVisibilityToggle(space.id)}
            >
              <Checkbox
                id={`visibility-${space.id}`}
                checked={isVisible}
                onCheckedChange={() => onSpaceVisibilityToggle(space.id)}
                className="pointer-events-none h-3.5 w-3.5"
              />
              <div className={cn('w-2 h-2 rounded-full', colors.dot)} />
              <Label
                htmlFor={`visibility-${space.id}`}
                className="text-[10px] md:text-xs cursor-pointer truncate max-w-[60px] md:max-w-[80px]"
              >
                {space.name}
              </Label>
            </div>
          );
        })}
      </div>
    </div>
  );
}
