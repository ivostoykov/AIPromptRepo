# AI Prompt Repo

The original idea was to maintain a set of predefined ChatGPT prompts that could be used as is or with minor modifications to suit the flow. However, it became apparent that various contexts required the inclusion of some recurring static information, leading to a slight expansion of the functionality. For more details, see the Options section.

## UI

### Main Menu

![Main Menu](meida/menu.png)
The snippet list can be `Export`ed and `Import`ed from here. The `Options` page is also available here apart from the stadard Extension page interface.

#### Top Ribbon

![Ribbon](meida/ribbon.png)

On the left is the main menu (<img src="ext/img/menu.svg" height="16"/>).

On the right-hand side, from right to left, are:
* Close button ( <img src="ext/img/close.svg" height="24"/> )
* New item button ( <img src="ext/img/newitem.svg" height="24"/> )
* Search button ( <img src="ext/img/search.svg" height="24"/> )

#### Search to filter

<img src="meida/search.gif" />

## Cards

![Card UI](meida/card.png)

The elements from left to right are:

* Expand/Collapse button ( <img src="ext/img/left-arrowhead.svg" height="16"/> )

![Expand and Collapse](meida/expand.gif)

* Title - a free descriptive text giving a hint what the card contains
* Copy button ( <img src="ext/img/copy.svg" height="24"/> )
* Edit button ( <img src="ext/img/edit.svg" height="24"/> )
* Send to button ( <img src="ext/img/sendto.svg" height="24"/> )

**Note:** This will try to insert the body of the card into recognizable input or active elements that accept user input. As feasible targets are text inputs, textareas, and elements with set contenteditable attribute. (*see the next item for more information*)

* Send to and Run button ( <img src="ext/img/sendtorun.svg" height="24"/> )

![Execute](meida/execute.gif)

---

**Note 1:** This is tested and expected to work only with AI Web interfaces. (*See next Note 2*)

**Note 2:** Currently ChatGPT, Gemini (Google) and You.com are supported. There is a chance for similar web services using a `textarea` for the user input to work as well.

---

* Delete button ( <img src="ext/img/delete.svg" height="24"/> )


## Options
![Options page](meida/options.png)

* `Show Embedded Button` controls the visibility of the button, which typically appears in the middle of the browser's right edge.
* `Close Sidebar When Click Outside` determines the behavior when clicking outside the panel.
* `Close After Send To` manages the panel's behavior after sending something, typically followed by actions outside the panel.
* `Close Sidebar After Copy` functions similarly to the above but activates after clicking the copy button.

### Allowed Urls:

* When empty or if the first line is `*`, it indicates that the extension can be used on any page without restrictions.
* This box may contain a list of full or partial domains separated by semicolons (`;`), commas (`,`), or placed on new lines (one domain per line).

The latter configuration will allow the extension to operate only on sites that match any domain from the list. The list does not support regular expressions or other types of filters. You may experiment, but it is generally expected that the domain names in the list consist of two or three parts like:

```
google.com
translate.google.com
```

---

You may want to read the [Privacy Policy](others/pryvacy.md)