import React from "react";
import { AlertCircle, FileQuestion, RefreshCw, Lock, ShieldAlert } from "lucide-react";
import { Button } from "./Card";

export const LoadingState: React.FC<{ message?: string }> = ({ message = "Loading healthcare records..." }) => (
  <div className="flex flex-col items-center justify-center p-12 text-center min-h-[250px]">
    <div className="relative mb-4">
      <div className="w-12 h-12 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
    </div>
    <p className="text-sm font-medium text-slate-600  animate-pulse">{message}</p>
  </div>
);

export const EmptyState: React.FC<{
  title?: string;
  description?: string;
  message?: string;
  actionText?: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({
  title = "No records found",
  description,
  message,
  actionText,
  actionLabel,
  onAction,
}) => {
  const displayDesc = description || message || "There are no healthcare records matching the current filter criteria.";
  const displayAction = actionText || actionLabel;

  return (
    <div className="flex flex-col items-center justify-center p-10 text-center bg-slate-50  rounded-2xl border border-dashed border-slate-200 ">
      <div className="w-12 h-12 rounded-2xl bg-blue-50  text-blue-600 flex items-center justify-center mb-3">
        <FileQuestion className="w-6 h-6" />
      </div>
      <h4 className="text-base font-semibold text-slate-800  mb-1">{title}</h4>
      <p className="text-xs sm:text-sm text-slate-500 max-w-sm mb-4">{displayDesc}</p>
      {displayAction && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {displayAction}
        </Button>
      )}
    </div>
  );
};

export const ErrorState: React.FC<{
  title?: string;
  message?: string;
  onRetry?: () => void;
}> = ({
  title = "Unable to load data",
  message = "An error occurred while communicating with the hospital database.",
  onRetry,
}) => (
  <div className="flex flex-col items-center justify-center p-8 text-center bg-rose-50/50  rounded-2xl border border-rose-200 ">
    <div className="w-12 h-12 rounded-2xl bg-rose-100  text-rose-600 flex items-center justify-center mb-3">
      <AlertCircle className="w-6 h-6" />
    </div>
    <h4 className="text-base font-semibold text-rose-900  mb-1">{title}</h4>
    <p className="text-xs sm:text-sm text-rose-700  max-w-md mb-4">{message}</p>
    {onRetry && (
      <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
        <RefreshCw className="w-3.5 h-3.5" /> Retry Request
      </Button>
    )}
  </div>
);

export const UnauthorizedState: React.FC<{ onLogin?: () => void }> = ({ onLogin }) => (
  <div className="flex flex-col items-center justify-center p-12 text-center bg-amber-50/30  rounded-2xl border border-amber-200 ">
    <div className="w-14 h-14 rounded-2xl bg-amber-100  text-amber-600 flex items-center justify-center mb-4">
      <Lock className="w-7 h-7" />
    </div>
    <h3 className="text-lg font-bold text-slate-800  mb-1">Authentication Required</h3>
    <p className="text-xs sm:text-sm text-slate-500 max-w-sm mb-5">
      Your session may have expired or you do not have appropriate healthcare clearance to view this module.
    </p>
    {onLogin && (
      <Button variant="primary" size="md" onClick={onLogin}>
        Authenticate to OneHealth ID
      </Button>
    )}
  </div>
);
