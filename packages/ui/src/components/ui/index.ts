/**
 * @leanmcp/ui/components/ui - shadcn-based UI Components
 *
 * Re-exports all shadcn/ui components for use in MCP Apps.
 * These are the base components used by MCP-native components.
 */

// Core
export { Button, buttonVariants } from './button';
export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from './card';
export { Input } from './input';
export { Label } from './label';
export { Textarea } from './textarea';

// Form
export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
} from './select';
export { Checkbox } from './checkbox';
export { Slider } from './slider';
export { Switch } from './switch';
export {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  useFormField,
} from './form';

// Feedback
export { Alert, AlertTitle, AlertDescription } from './alert';
export { Badge, badgeVariants } from './badge';
export { Progress } from './progress';
export { Skeleton } from './skeleton';
export { Toaster } from './sonner';

// Layout
export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './dialog';
export { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs';
export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor } from './popover';
export { Separator } from './separator';
export { ScrollArea, ScrollBar } from './scroll-area';

// Navigation
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
} from './dropdown-menu';
export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
} from './command';

// Data
export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from './table';

// Overlay
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './tooltip';
