-- Task 1.5 (ADR-027): "Annulla questo import" deletes the import's rows and
-- moves the import to 'undone', keeping its counters for the log and metrics.
-- No policy changes: imports are already updatable by household members, and
-- deleting the rows goes through transactions_delete (owner or admin).

alter table imports drop constraint imports_status_check;
alter table imports add constraint imports_status_check
  check (status in ('processing','done','failed','undone'));
