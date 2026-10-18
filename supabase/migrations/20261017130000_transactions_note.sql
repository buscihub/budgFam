-- Task 1.5b: free-text note on a transaction.
-- The note has the visibility of its transaction (same row, same RLS policies)
-- and never goes to the AI model (rule 4.1.5).
-- No policy changes. Column grants are an allow-list (ADR-019), so `note` must
-- be added to the updatable columns or nobody could save it.

alter table transactions add column note text;
alter table transactions add constraint transactions_note_length
  check (note is null or char_length(note) <= 500);

revoke update on transactions from authenticated;
grant update (booked_on, amount_cents, description, note, category_id, category_source,
              ai_confidence, needs_review, visibility, visibility_overridden,
              transfer_member_id)
  on transactions to authenticated;
