export default function Card({
  as: Component = 'div',
  padding = 'md',
  shadow = 'sm',
  rounded = 'none',
  className = '',
  children,
  ...props
}) {
  const paddingStyles = { none: '', sm: 'p-4', md: 'p-6', lg: 'p-8' };
  const shadowStyles = {
    none: '',
    sm: 'shadow-[6px_6px_0px_#000]',
    md: 'shadow-[6px_6px_0px_#000]',
    lg: 'shadow-[6px_6px_0px_#000]',
  };
  const roundedStyles = { none: 'rounded-none', md: 'rounded-none', lg: 'rounded-none', full: 'rounded-none' };
  return (
    <Component
      className={`border-4 border-black bg-[#F9FBF9] font-minecraft dark:border-black dark:bg-slate-900 ${paddingStyles[padding] ?? paddingStyles.md} ${shadowStyles[shadow] ?? shadowStyles.sm} ${roundedStyles[rounded] ?? roundedStyles.none} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}
