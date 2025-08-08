"use client";
import React, { useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWorkspace } from "@/context/WorkspaceContext";

export default function TimezoneSelect({
  value,
  onValueChange,
  disabled,
  triggerClassName,
}) {
  const {
    availableTimezones,
    timezonesLoading,
    timezonesError,
    fetchTimezones,
  } = useWorkspace();

  useEffect(() => {
    // Fetch timezones if not already loaded or loading, or if there was an error
    if (
      !timezonesLoading &&
      availableTimezones.length === 0 &&
      !timezonesError
    ) {
      fetchTimezones();
    }
  }, [availableTimezones, timezonesLoading, timezonesError, fetchTimezones]);

  return (
    <Select
      onValueChange={onValueChange}
      value={value}
      disabled={disabled || timezonesLoading}
    >
      <SelectTrigger className={triggerClassName}>
        <SelectValue placeholder="Select timezone" />
      </SelectTrigger>
      <SelectContent>
        {timezonesLoading && (
          <SelectItem value="loading" disabled>
            Loading timezones...
          </SelectItem>
        )}
        {timezonesError && (
          <SelectItem value="error" disabled>
            Error: {timezonesError}
          </SelectItem>
        )}
        {!timezonesLoading &&
          !timezonesError &&
          availableTimezones.length === 0 && (
            <SelectItem value="notfound" disabled>
              No timezones found
            </SelectItem>
          )}
        {availableTimezones.map((tz, index) => (
          <SelectItem key={`${tz.value}-${index}`} value={tz.value}>
            {tz.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
