'use client';

interface CategoryTabsProps {
  categories: string[];
  activeCategory: string;
  onSelectCategory: (category: string) => void;
}

export default function CategoryTabs({
  categories,
  activeCategory,
  onSelectCategory
}: CategoryTabsProps) {
  return (
    <div className="flex w-full overflow-x-auto pb-3 pt-1 scrollbar-none select-none">
      <div className="flex space-x-2.5">
        {categories.map((category) => {
          const isActive = activeCategory === category;
          return (
            <button
              key={category}
              onClick={() => onSelectCategory(category)}
              className={`rounded-full px-5 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-200 whitespace-nowrap border active:scale-[0.96] cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-primary to-primary-dark text-white border-transparent shadow-md shadow-primary/25 scale-[1.02]'
                  : 'bg-white text-text-muted border-slate-100 hover:text-primary hover:border-primary/35 hover:bg-primary-light/10'
              }`}
            >
              {category}
            </button>
          );
        })}
      </div>
    </div>
  );
}

