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
    <div className="flex w-full overflow-x-auto pb-3 pt-1 scrollbar-thin select-none">
      <div className="flex space-x-2">
        {categories.map((category) => {
          const isActive = activeCategory === category;
          return (
            <button
              key={category}
              onClick={() => onSelectCategory(category)}
              className={`rounded-2xl px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 whitespace-nowrap border active:scale-[0.97] cursor-pointer ${
                isActive
                  ? 'bg-primary text-white border-transparent shadow-md shadow-primary/20 scale-[1.02]'
                  : 'bg-white text-text-primary border-gray-100 hover:border-primary/30 hover:bg-primary-light/30'
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
