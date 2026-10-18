import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Link, type LinkProps } from 'react-router';
import { cn } from '@/utils/cn';
import styles from './button.module.css';

export type ButtonVariant =
  'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'dangerSolid';
export type ButtonSize = 'sm' | 'md' | 'lg';

type StyleProps = { variant?: ButtonVariant; size?: ButtonSize; block?: boolean };

function buttonClass(
  { variant = 'primary', size = 'sm', block = false }: StyleProps,
  extra?: string,
) {
  return cn(
    styles.button,
    styles[variant],
    size !== 'sm' && styles[size],
    block && styles.block,
    extra,
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & StyleProps;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, block, className, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClass({ variant, size, block } as StyleProps, className)}
      {...rest}
    />
  );
});

export function LinkButton({ variant, size, block, className, ...rest }: LinkProps & StyleProps) {
  return (
    <Link className={buttonClass({ variant, size, block } as StyleProps, className)} {...rest} />
  );
}

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  tone?: 'default' | 'danger';
};

/** Botón de solo ícono: siempre con `aria-label` traducido y objetivo de 44 px. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, tone = 'default', className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn(styles.button, styles.icon, tone === 'danger' && styles.iconDanger, className)}
      {...rest}
    >
      {children}
    </button>
  );
});
