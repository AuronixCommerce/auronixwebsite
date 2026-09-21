"use client";
import {
  CSSProperties,
  ReactNode,
  useEffect,
  useRef,
  useState,
  useId,
  cloneElement,
  isValidElement,
  ReactElement,
  Children,
} from "react";
import { ArrowUpRight, Check, Copy, UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";
import { SelectTrigger as FieldSelectTrigger } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
export {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
export { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
export { Switch } from "@/components/ui/switch";
export { Checkbox } from "@/components/ui/checkbox";
export {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
export {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
export {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
export {
  DropdownMenu as Dropdown,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
export {
  Table as DataTable,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table";
export { Skeleton } from "@/components/ui/skeleton";
export { Toast, ToastTitle, ToastDescription } from "@/components/ui/toast";
export { EmptyState } from "@/components/site/states";
export function Spinner({
  className,
  label = "Loading",
  ...rest
}: {
  className?: string;
  label?: string;
  [key: string]: unknown;
}) {
  return (
    <span
      {...rest}
      className={cn("ac-spinner", className)}
      role="status"
      aria-label={label}
    >
      <span className="sr-only">{label}</span>
      {Array.from({ length: 12 }, (_, i) => (
        <i key={i} style={{ "--spoke": i } as CSSProperties} />
      ))}
    </span>
  );
}
export function GlassPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("ac-glass", className)}>{children}</div>;
}
export function FeatureCard({
  title,
  description,
  icon,
  index,
}: {
  title: string;
  description: string;
  icon?: ReactNode;
  index?: number;
}) {
  return (
    <article className="ac-feature">
      <div className="ac-feature-top">
        {icon}
        <span>
          {index === undefined ? null : String(index + 1).padStart(2, "0")}
        </span>
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
    </article>
  );
}
export function AnimatedNumber({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(value);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;
    let frame = 0;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min((now - start) / 650, 1);
        setDisplay(Math.round(value * (1 - Math.pow(1 - t, 3))));
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value]);
  return (
    <span ref={ref} className="tabular-nums">
      {display}
    </span>
  );
}
export function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="ac-metric">
      <strong>
        <AnimatedNumber value={value} />
      </strong>
      <span>{label}</span>
    </div>
  );
}
export function StatusBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "pending" | "error";
}) {
  return (
    <span className="ac-status" data-tone={tone}>
      {children}
    </span>
  );
}
export function CopyDetail({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <button
      type="button"
      className="ac-copy"
      aria-label={`Copy ${value}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => setCopied(false), 1800);
        } catch {
          toast({
            title: "Unable to copy",
            description: "Select and copy the detail manually.",
          });
        }
      }}
    >
      {copied ? <Check size={16} /> : <Copy size={16} />}
      <span className="sr-only" role="status">
        {copied ? "Copied" : ""}
      </span>
    </button>
  );
}
export function ProgressIndicator({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <div className="ac-progress">
      <div>
        <span>{label}</span>
        <span>{Math.round(value)}%</span>
      </div>
      <progress
        max={100}
        value={Math.max(0, Math.min(100, value))}
        aria-label={label}
      />
    </div>
  );
}
export function SegmentedControl({
  options,
  value,
  onChange,
  label,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="ac-segments">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={value === option}
          onClick={() => onChange(option)}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
export function FormField({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  const [localError, setLocalError] = useState("");
  const message = error || localError;
  const attach = (node: ReactNode): ReactNode =>
    Children.map(node, (child) => {
      if (!isValidElement(child)) return child;
      const props = child.props as any;
      const type = child.type as any;
      const name = type.displayName || type.name || type;
      if (name === "Select")
        return cloneElement(
          child as ReactElement<any>,
          {},
          attach(props.children),
        );
      if (
        type === FieldSelectTrigger ||
        name === "SelectTrigger" ||
        name === "Input" ||
        name === "Textarea" ||
        ["input", "textarea", "select"].includes(name)
      )
        return cloneElement(child as ReactElement<any>, {
          id,
          "aria-describedby": message ? errorId : props["aria-describedby"],
          "aria-invalid": !!message || undefined,
          "aria-required": required || undefined,
          onBlur: (e: any) => {
            props.onBlur?.(e);
            const value = e.target.value;
            if (typeof value !== "string") return;
            setLocalError(
              required && !value.trim()
                ? `${label} is required.`
                : props.type === "email" &&
                    value &&
                    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
                  ? "Please enter a valid email."
                  : "",
            );
          },
          onChange: (e: any) => {
            setLocalError("");
            props.onChange?.(e);
          },
        });
      return props.children
        ? cloneElement(child as ReactElement<any>, {}, attach(props.children))
        : child;
    });
  return (
    <div className="ac-field" data-invalid={!!message}>
      <LabelText id={id} label={label} required={required} />
      {attach(children)}
      {message && (
        <p id={errorId} role="alert" className="ac-field-error">
          {message}
        </p>
      )}
    </div>
  );
}
function LabelText({
  id,
  label,
  required,
}: {
  id: string;
  label: string;
  required?: boolean;
}) {
  return (
    <label htmlFor={id}>
      {label}
      {required && <span aria-hidden="true"> *</span>}
    </label>
  );
}
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="ac-modal">
        <DialogTitle>{title}</DialogTitle>
        {description && <DialogDescription>{description}</DialogDescription>}
        {children}
      </DialogContent>
    </Dialog>
  );
}
export const BottomSheet = Modal;
export function FileUploader({
  id,
  accept,
  onChange,
  disabled,
  multiple = false,
}: {
  id?: string;
  accept?: string;
  onChange: (files: File[]) => void;
  disabled?: boolean;
  multiple?: boolean;
}) {
  const [names, setNames] = useState<string[]>([]);
  return (
    <label className="ac-upload">
      <UploadCloud size={28} />
      <span>Choose {multiple ? "files" : "a file"}</span>
      {accept && <small>{accept}</small>}
      <input
        id={id}
        type="file"
        accept={accept}
        disabled={disabled}
        multiple={multiple}
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          setNames(files.map((f) => f.name));
          onChange(files);
        }}
      />
      {names.map((n) => (
        <span key={n}>{n}</span>
      ))}
    </label>
  );
}
