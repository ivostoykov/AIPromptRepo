## UI

### Main View

<img src="meida/main.png" height="480"/>

### Main Menu

![Main Menu](meida/menu.png)
The snippet list can be `Export`ed and `Import`ed from here. The `Options` page is also available here apart from the stadard Extension page interface.

#### Top Ribbon

![Ribbon](meida/ribbon.png)

On the left is the main menu (<img src="src/img/menu.svg" height="16"/>).

On the right-hand side, from right to left, are:
* Close button ( <img src="src/img/close.svg" height="24"/> )
* New item button ( <img src="src/img/newitem.svg" height="24"/> )
* Search button ( <img src="src/img/search.svg" height="24"/> )

#### Search to filter

<img src="meida/search.gif" width="450"/>

## Cards

![Card UI](meida/card.png)

The elements from left to right are:

---

* Expand/Collapse button ( <img src="src/img/left-arrowhead.svg" height="16"/> )

<img src="meida/expand.gif" width="450" alt="Expand and Collapse" />

---

* Title - a free descriptive text giving a hint what the card contains
* Copy button ( <img src="src/img/copy.svg" height="24"/> )

---

* Edit button ( <img src="src/img/edit.svg" height="24"/> )

`Save` ( <img src="src/img/save.svg" height="24"/> ), `Cancel` ( <img src="src/img/cancel.svg" height="24"/> ) or `Skipt` ( <img src="src/img/skip.svg" height="24"/> ) to the next will be available when edit mode is active.

One can edit the title ...

<img src="meida/edit_title.png" width="450" alt="Expand and Collapse" />

or the body.

<img src="meida/edit_body.png" width="450" alt="Expand and Collapse" />

---

* Put into button ( <img src="src/img/import.svg" height="24"/> ) - copies content and allow pasting it into any element with left click.

* Send to button ( <img src="src/img/sendto.svg" height="24"/> ) - sends content to the  first found suitable element - usually textarea or input type text.

**Note:** This will try to insert the body of the card into recognizable input or active elements that accept user input. As feasible targets are text inputs, textareas, and elements with set contenteditable attribute. (*see the next item for more information*)

---

* Send to and Run button ( <img src="src/img/sendtorun.svg" height="24"/> )

<img src="meida/execute.gif" width="450" alt="Execute" title="Execute"/>

**Note 1:** This is tested and expected to work only with AI Web interfaces. (*See next Note 2*)

**Note 2:** Currently ChatGPT, Gemini (Google) and You.com are supported. There is a chance for similar web services using a `textarea` for the user input to work as well.

---

* Delete button ( <img src="src/img/delete.svg" height="24"/> )




## Options
<img src="meida/options.png" width="800" alt="Options page" />

* `Show Embedded Button` controls the visibility of the button, which typically appears in the middle of the browser's right edge.
* `Close Sidebar When Click Outside` determines the behavior when clicking outside the panel.
* `Close After Send To` manages the panel's behavior after sending something, typically followed by actions outside the panel.
* `Close Sidebar After Copy` functions similarly to the above but activates after clicking the copy button.

### Allowed Urls:

![Allowed Urls](meida/Allowed_Urls.png)

* When empty or if the first line is `*`, it indicates that the extension can be used on any page without restrictions.
* This box may contain a list of full or partial domains separated by semicolons (`;`), commas (`,`), or placed on new lines (one domain per line).

The latter configuration will allow the extension to operate only on sites that match any domain from the list. The list does not support regular expressions or other types of filters. You may experiment, but it is generally expected that the domain names in the list consist of two or three parts like:

```
google.com
translate.google.com
```

### Other buttons

<img src="meida/other_buttons.png" alt="Other buttons">

Additional options are available for importing, exporting, and backing up data.

**Note:** Only one backup can be stored at a time, and any new backup will replace the existing one."
