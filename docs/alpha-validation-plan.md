# Tada Alpha Validation Plan

## Goal

Verify that an Israeli small-business owner can upload a real export, trust the
result, identify one useful business fact, and understand how to update the
dashboard later.

## Participants

Run five observed sessions with owners or operators who regularly receive CSV
or Excel exports. Use their own data where possible. Do not coach them through
the interface.

## Session script

1. Ask: “What decision do you hope this file helps you make?”
2. Give them Tada and say: “Use this file to understand what is happening in
   the business.”
3. Observe the upload and first dashboard without intervening.
4. Ask them to explain the primary KPI and one chart in their own words.
5. Ask: “How would you verify that number?”
6. Ask one natural-language question through Ask Tada.
7. Ask them to find a specific period or category.
8. Ask how they expect to update the dashboard next week or month.
9. End with: “What would prevent you from using this again?”

## Record per session

- File type, row count, language, and business domain—never copy raw customer
  data into research notes.
- Upload success or failure and time to first dashboard.
- First metric or chart the participant examines.
- Whether they interpret the primary KPI correctly.
- Any incorrect total, aggregation, label, period, currency, or conclusion.
- Whether Show data and source/date context answer their trust questions.
- First chat question and whether the answer is verifiable.
- Requested retention loop: refresh, share link, export, or something else.
- Return intent: yes, maybe, or no, with the participant's reason.

## Funnel events to instrument after consent decision

Do not add third-party analytics until the owner selects the provider and
updates the privacy disclosure. The minimum event vocabulary is:

- `upload_started`
- `profile_succeeded`
- `dashboard_generated`
- `dashboard_viewed`
- `show_data_opened`
- `filter_applied`
- `chat_question_sent`
- `dashboard_edit_applied`
- `source_replaced`

Events must not include file names, column names, row values, prompts, chart
titles, or other customer data. User and dashboard identifiers should be
pseudonymous. “First useful insight” should come from an explicit user feedback
control or research observation, not an inferred click.

## Ship gate

Do not call the product beta-ready until:

- All five participants reach a dashboard from a supported file.
- No participant sees a materially wrong headline metric.
- At least four correctly explain the primary KPI and its date/comparison
  context.
- At least four can verify a number through Show data or provenance.
- At least three identify a useful business fact without coaching.
- The top requested retention loop is clear enough to choose one next feature.
