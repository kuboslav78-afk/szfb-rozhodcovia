-- Doteraz sme ako zmenu termínu sledovali len zmenu času (previous_match_time).
-- Zápas sa ale môže presunúť aj na iný deň — pridávame rovnaké sledovanie pre dátum,
-- nech re-import aj ručná úprava vrátia nomináciu na "sent" aj pri zmene hracieho dňa.
alter table matches add column if not exists previous_match_date date;
