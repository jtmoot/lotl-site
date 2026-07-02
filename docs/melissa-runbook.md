# Melissa's runbook: updating the Ladies on the Links site

Hi Melissa! 💚 This is your step-by-step guide for the handful of things you keep
the site fresh with each month. Everything here happens **in your web browser on
GitHub.com**. You do not need to install anything, you do not need any special
software, and you cannot break the live site (more on that at the bottom).

This guide covers only the tasks that are yours:

1. [Add a photo to the gallery](#task-a-add-a-photo-to-the-gallery)
2. [Publish a story or member spotlight](#task-b-publish-a-story-or-member-spotlight)
3. [Edit the merch or FAQ wording](#task-c-edit-the-merch-or-faq-wording)

If you ever want to do something that is not in this guide, just text Josh or
Stacey. Anything outside these three tasks is not yours to worry about.

> Screenshots are coming. Anywhere you see `[screenshot: ...]`, a picture will be
> added later so you can match what is on your screen.

> **Stuck at any point? Ask an AI.** Open ChatGPT or Claude in another tab, paste
> this whole guide in, and tell it what you are trying to do (for example, "I am
> on the step about uploading a photo and I cannot find the Add file button").
> It can walk you through it in plain language, any time of day, without needing
> to reach Josh or Stacey. This guide is written so an AI can pick up right where
> you are.

---

## How the site updates (the 30-second version)

The whole website lives in one place on GitHub.com called a **repository** (or
"repo" for short). When you change a file there and save it, the site rebuilds
itself automatically and your change shows up live in about 1 to 2 minutes. That
is it. You edit a file, you save, you are done.

**You cannot take the site down.** If something in an edit is not quite right,
the rebuild simply stops and the site keeps showing the last good version. So the
worst case is "my change did not appear," never "I broke the website." See
[If something does not show up](#if-something-does-not-show-up) at the end.

---

## One-time orientation (read once, then skip)

Every task below uses the same few buttons, so here is the lay of the land.

- **The repo.** Open the project page on GitHub.com (Josh will send you the link
  and add you so you can edit). Everything lives in folders here.
  `[screenshot: the repo home page with the file list]`
- **Folders.** Click a folder name to go into it. Click a file name to view it.
- **Edit a file.** Open a file, then click the **pencil icon** at the top right
  to edit it. `[screenshot: the pencil/edit icon]`
- **Add or upload a file.** Inside a folder, click the **Add file** button near
  the top right, then choose **Upload files** (for photos) or **Create new file**
  (for a new story). `[screenshot: the Add file menu]`
- **Saving = "Commit".** When you are done, you click a green **Commit changes**
  button. A "commit" is just GitHub's word for "save this update." You can type a
  short note about what you changed (for example, "Add July gallery photo"), then
  confirm. `[screenshot: the green Commit changes button]`

That is the entire toolkit. Now the three tasks.

---

## Task A: Add a photo to the gallery

The gallery is the general photo grid. No names or captions are needed, just nice
pictures from our Mondays and events.

Adding a photo is two small steps: **upload the picture**, then **tell the site
to show it** by copying one short template file.

### Step 1: Upload the picture

1. In the repo, open the folder **`src/assets/photos/gallery`**. This is where all
   gallery images live. `[screenshot: inside the gallery photos folder]`
2. Click **Add file**, then **Upload files**.
3. Drag your photo from your computer into the box (or click to choose it). Use a
   simple file name with no spaces, like `july-scramble.jpg`.
   `[screenshot: the drag-and-drop upload box]`
4. Scroll down and click **Commit changes**. Your photo is now uploaded, but not
   yet shown on the site. Step 2 turns it on.

### Step 2: Tell the site to show it

We do this by copying an existing entry and changing one line. You will use the
seed file **`north-hill.md`** as your template.

1. Open the folder **`src/content/gallery`**.
2. Click **`north-hill.md`** to open it, then click the **pencil icon** to edit.
   You will see something like this at the top:

   ```
   ---
   images:
     - ../../assets/photos/gallery/nh-gallery-1.jpg
     - ../../assets/photos/gallery/nh-gallery-6.jpg
   alt: A scenic fairway at North Hill Country Club in Duxbury
   event: North Hill Country Club
   date: 2026-06-18
   ---
   ```

3. Rather than changing this file, make your own. Click **Add file**, then
   **Create new file**, inside the `src/content/gallery` folder.
4. Name your new file after the photo or event, ending in `.md`, for example
   `july-scramble.md`. (No spaces, lowercase is easiest.)
5. Paste this in, then swap in your photo's file name on the `images` line:

   ```
   ---
   images:
     - ../../assets/photos/gallery/july-scramble.jpg
   date: 2026-07-14
   ---

   Photos from our July scramble.
   ```

   - The `images` line must match the file name you uploaded in Step 1, kept in
     the `../../assets/photos/gallery/` folder path exactly as shown.
   - `date` is optional but nice for ordering. Use the `YYYY-MM-DD` format.
   - You can list more than one photo by adding more `- ../../assets/...` lines,
     one per photo, all uploaded first in Step 1.
6. Click **Commit changes**. In a minute or two your photo appears in the gallery.

That is it. No names, no captions, just the photo.

---

## Task B: Publish a story or member spotlight

Stories are our blog: member spotlights, event recaps, and the occasional tip.
Each story is one file. The easiest way is to copy the existing Melissa spotlight
and change the words.

### A quick note on member spotlights

When you feature a member, we use **first names only**, and **only with that
member's say-so**. If anyone ever asks us to take a story or photo down, we do it
right away. Please keep that promise in every spotlight you publish.

### Steps

1. First, upload a **cover image** for the story, exactly like Task A Step 1:
   open **`src/assets/photos/gallery`**, click **Add file**, **Upload files**,
   drag your picture in, and **Commit changes**. (Cover photos can live in this
   same folder.)
2. Open the folder **`src/content/stories`** and click **`member-spotlight-melissa.md`**
   to see the template. It looks like this:

   ```
   ---
   cover: ../../assets/photos/gallery/nh-gallery-6.jpg
   title: Member spotlight, a first season to remember
   date: 2026-06-16
   author: Stacey
   attribution: Melissa
   ---

   This week we are cheering on Melissa, who picked up a club for the very
   first time this spring...
   ```

3. Make your own file: in `src/content/stories`, click **Add file**, then
   **Create new file**. Name it after the story, ending in `.md`, for example
   `member-spotlight-karen.md`.
4. Paste the template above and update each line:
   - **`cover`** — point it at the image you uploaded in Step 1, keeping the
     `../../assets/photos/gallery/` path.
   - **`title`** — the headline for the post.
   - **`date`** — the publish date, in `YYYY-MM-DD` format. Stories show
     newest first.
   - **`author`** — usually `Stacey`, or `Christian Grace` for a tip.
   - **`attribution`** — for a member spotlight only, the member's **first name**.
     Leave this line out for a regular post.
5. Below the closing `---`, write the story in plain sentences. Press Enter twice
   between paragraphs.
6. Click **Commit changes**. The story appears on the Stories page in a minute or
   two.

**Tip: want to stage a draft?** Add a line `draft: true` inside the top section
(between the `---` lines). The post stays hidden until you change it to
`draft: false` (or delete the line) and commit again.

---

## Task C: Edit the merch or FAQ wording

Sometimes you just need to tweak some words: update the merch blurb, or fix and
add a question on the FAQ page.

> **Please read this caution first.** These two files are a little different from
> the gallery and stories. They contain some website code around the words. You
> only ever change the **text inside the quotation marks or between the tags**.
> Do not touch the brackets, quotes, commas, or anything that looks like code. If
> a change feels risky, make a smaller change or ask Josh. And remember: even if
> something is off, the live site stays up (see the safety net below).

### Editing the merch wording

1. Open the file **`src/pages/merch.astro`** and click the **pencil icon**.
2. Find the human sentences, such as the headline
   `Ladies on the Links merch is on the way.` and the paragraph that follows it.
   `[screenshot: the merch text highlighted]`
3. Change only those words. Leave everything around them exactly as it is.
4. Click **Commit changes**.

### Editing or adding an FAQ

1. Open the file **`src/pages/faq.astro`** and click the **pencil icon**.
2. You will see a list of questions and answers, each looking like this:

   ```
   {
     q: 'Where do I book?',
     a: 'Tee times and lessons are booked through the Schedule page...',
   },
   ```

3. **To fix an answer:** change only the words inside the quotes after `a:`.
   Do not remove the quotes or the comma. `[screenshot: an FAQ answer highlighted]`
4. **To add a new question:** copy one whole block (from `{` to `},` including
   both lines), paste it right after another block, and change the words inside
   the quotes for `q:` and `a:`. Keep the punctuation exactly as the others have it.
5. Click **Commit changes**.

A few wording reminders for any copy you write: keep Stacey's warm, friendly
voice, and please **do not use long dashes** (use commas or periods instead).

---

## If something does not show up

After you commit, the site takes a minute or two to rebuild. If your change has
not appeared after a few minutes:

- **Most likely it is still building.** Give it another minute and refresh.
- **If an edit had a small mistake** (a missing line, a typo in a file path), the
  rebuild stops on purpose and **the site keeps showing the last good version**.
  Nothing is broken and nothing is lost. Your draft edit is saved in GitHub.
- **What to do:** text or email Josh with a note about what you changed. He can
  spot the fix quickly. You do not need to undo anything yourself.

This is the safety net: a bad edit can never take the live site down. The worst
that happens is your new change waits until the small fix is made. So go ahead and
update with confidence. 💚

---

## Quick reference

| I want to...            | Folder / file                                   | How                                              |
| ----------------------- | ----------------------------------------------- | ------------------------------------------------ |
| Add a gallery photo     | Upload to `src/assets/photos/gallery`, then add a file in `src/content/gallery` | Copy `north-hill.md` as a template, point `images` at your photo |
| Publish a story/spotlight | Upload cover to `src/assets/photos/gallery`, then add a file in `src/content/stories` | Copy `member-spotlight-melissa.md` as a template, update the lines |
| Edit merch wording      | `src/pages/merch.astro`                         | Change only the words, not the code around them    |
| Edit or add an FAQ      | `src/pages/faq.astro`                           | Change the words inside the quotes, or copy a `{ q, a }` block |

Every task ends the same way: click the green **Commit changes** button. That is
your save. Welcome aboard, and thank you for keeping the site alive. ⛳

---

## For Josh (or whoever runs the repo): giving Melissa access

Melissa needs a free GitHub account and **write access** to the repo before any
of the above works. One-time setup, about two minutes:

1. Ask Melissa to make a free account at **github.com** and send you her username.
2. Go to the repo on GitHub.com, then **Settings** (top of the repo) then
   **Collaborators and teams** in the left sidebar. (You may be asked for your
   password or a 2FA code.)
3. Click **Add people**, type her GitHub username, and pick the **Write** role.
   Write lets her edit files and commit; it does **not** let her change repo
   settings, manage access, or delete the repo.
4. She gets an email invite. Once she clicks **Accept**, send her the repo link
   and this guide. She is ready.

To remove access later, the same Collaborators page has a **Remove** button next
to her name.

> **Note if the repo is public:** anyone can *view* the code and *fork* it, but
> only invited collaborators like Melissa can actually change the live site. Being
> public does not give strangers edit access.
