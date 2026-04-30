import React, { useState } from 'react';
import { 
  ChefHat, 
  Search, 
  BookOpen, 
  Package, 
  Calendar, 
  ShoppingCart, 
  Menu, 
  X,
  Camera,
  Flame,
  User
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  onClick: () => void;
  key?: string | number;
}

const SidebarItem = ({ icon: Icon, label, active, onClick }: SidebarItemProps) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 w-full text-left",
      active 
        ? "bg-orange-500 text-white shadow-lg shadow-orange-200" 
        : "text-stone-600 hover:bg-stone-100"
    )}
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </button>
);

export default function Layout({ children, activePage, setActivePage }: { 
  children: React.ReactNode, 
  activePage: string, 
  setActivePage: (page: string) => void 
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const menuItems = [
    { id: 'scan', label: 'Scan & Cook', icon: Camera },
    { id: 'recipes', label: 'My Recipes', icon: BookOpen },
    { id: 'pantry', label: 'Pantry', icon: Package },
    { id: 'mealplan', label: 'Meal Plan', icon: Calendar },
    { id: 'shopping', label: 'Shopping List', icon: ShoppingCart },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="min-h-screen bg-[#fdfcfb] flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 bg-white border-b border-stone-100 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="bg-orange-500 p-1.5 rounded-lg">
            <ChefHat className="text-white" size={20} />
          </div>
          <span className="font-bold text-xl tracking-tight text-stone-900">FlavorAI</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-stone-600"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-stone-100 p-6 sticky top-0 h-screen">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="bg-orange-500 p-2 rounded-xl shadow-lg shadow-orange-100">
            <ChefHat className="text-white" size={24} />
          </div>
          <div>
            <h1 className="font-bold text-xl tracking-tight text-stone-900">FlavorAI</h1>
            <p className="text-[10px] text-stone-400 uppercase tracking-widest font-semibold">Smart Recipe Assistant</p>
          </div>
        </div>

        <nav className="flex-1 flex flex-col gap-2">
          {menuItems.map((item) => (
            <SidebarItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={activePage === item.id}
              onClick={() => setActivePage(item.id)}
            />
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-stone-100" />
      </aside>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="fixed inset-0 z-40 md:hidden bg-white p-6 pt-20"
          >
            <nav className="flex flex-col gap-4">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActivePage(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-2xl text-lg font-medium transition-all",
                    activePage === item.id 
                      ? "bg-orange-500 text-white" 
                      : "text-stone-600 bg-stone-50"
                  )}
                >
                  <item.icon size={24} />
                  {item.label}
                </button>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
