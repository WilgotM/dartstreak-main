import { useTranslation } from "react-i18next";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SwitchTournamentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTournamentName: string;
  newTournamentName: string;
  onConfirm: () => void;
  loading?: boolean;
}

export function SwitchTournamentDialog({
  open,
  onOpenChange,
  currentTournamentName,
  newTournamentName,
  onConfirm,
  loading,
}: SwitchTournamentDialogProps) {
  const { t } = useTranslation();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("tournament.switchTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("tournament.switchDesc", {
              current: currentTournamentName,
              new: newTournamentName,
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>
            {t("common.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={loading}>
            {loading ? t("common.loading") : t("tournament.switchConfirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
