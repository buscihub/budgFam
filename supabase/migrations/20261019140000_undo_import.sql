-- Task 1.5 follow-up (ADR-027): "Annulla questo import" as one transaction, and
-- only for the person who uploaded the file.
--
-- From the app it was two statements (delete the rows, then mark the import
-- 'undone'): a failure between them left the rows gone and the import 'done'.
-- And an admin who did not upload the file could "undo" it while RLS hid the
-- uploader's private rows from them, leaving the import marked 'undone' with
-- its rows still in place (and the unique hash blocking a re-import). ADR-027
-- now says: only the uploader.
--
-- SECURITY INVOKER (the default): it runs as the caller, so RLS and column
-- grants still apply. No policy changes. The uploader owns every row of their
-- import, so the delete reaches all of them.

create function public.undo_import(p_import_id uuid)
returns integer
language plpgsql
set search_path = public
as $$
declare
  imp imports%rowtype;
  removed integer;
begin
  -- Locked, so two undo clicks cannot both run.
  select * into imp from imports where id = p_import_id for update;
  if not found then
    raise exception 'import_not_found' using errcode = 'P0002';
  end if;
  if imp.uploaded_by is distinct from auth.uid() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if imp.status = 'undone' then
    raise exception 'already_undone' using errcode = 'P0001';
  end if;
  if imp.status <> 'done' then
    raise exception 'not_undoable' using errcode = 'P0001';
  end if;

  delete from transactions where import_id = imp.id;
  get diagnostics removed = row_count;

  update imports set status = 'undone' where id = imp.id;

  return removed;
end;
$$;

revoke all on function public.undo_import(uuid) from public, anon;
grant execute on function public.undo_import(uuid) to authenticated;
