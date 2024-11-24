import { observer } from 'mobx-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/common/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/common/components/ui/drawer';
import { useIsDesktop } from '@/common/hooks/useMediaQuery';

interface Props {
  open: boolean;
  toggle: VoidFunction;

  title: string;
  description?: string;

  mainContent: React.ReactNode;
  footerContent?: React.ReactNode;
}

export const DrawerDialog = observer(function DrawerDialog({
  open,
  toggle,
  title,
  description,
  mainContent,
  footerContent,
}: Props) {
  const isDesktop = useIsDesktop();

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={toggle}>
        <DialogContent
          onInteractOutside={(ev) => {
            const target = ev.target as HTMLElement;
            if (!target.hasAttribute('data-state')) {
              ev.preventDefault();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          {mainContent}

          <DialogFooter className="pt-8">{footerContent}</DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={toggle}>
      <DrawerContent className="p-6 sm:px-32 md:px-64">
        <DrawerHeader className="text-left">
          <DrawerTitle>{title}</DrawerTitle>
          {description && <DrawerDescription>{description}</DrawerDescription>}
        </DrawerHeader>

        {mainContent}

        {footerContent && (
          <DrawerFooter className="pt-8">{footerContent}</DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
});
