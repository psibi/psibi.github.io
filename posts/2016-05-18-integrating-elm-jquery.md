---
title: Integrating Elm with a jQuery plugin
author: Sibi
---

For the past few days, I have been playing around with [Elm language](http://elm-lang.org/) to see if I can use it in one of my upcoming projects. While I was happy with the strongly typed language and the [architecture](http://guide.elm-lang.org/architecture/index.html), I was concerned if I can use the existing ecosystem of Javascript libraries in it without much boilerplate. This post will indeed show how easy that is. Note: if you have already read [this](http://guide.elm-lang.org/interop/javascript.html), then this article offers nothing new (Though I would argue that this gives an example with a real library). But if you haven't read it, then this may give you an rough idea of how much code is required for it.

## Objective

Let's take some jQuery plugin and then try to integrate it with Elm. I chose [notifyjs](https://notifyjs.com/) plugin which allows us to create notification. So our objective is to create a simple UI with a input text and a button. When the button is clicked, the text in the input form will be shown to us via the `notifyjs` plugin.

## The Elm part

The Elm code without any jQuery integration:

``` elm
module Notify exposing (..)

import Html exposing (Html, div, input, text, button)
import Html.App as Html
import Html.Attributes exposing (..)
import Html.Events exposing (onInput, onClick)
import String

main = Html.program { init = model
                    , view = view
                    , update = update
                    , subscriptions = \x -> Sub.none
                    }


type alias Model = { content : String }

model =  (Model "", Cmd.none)

type Msg  = Change String
          | Alert

update : Msg -> Model -> (Model, Cmd Msg)
update msg model =
  case msg of
    Change newContent ->
      ({ model | content = newContent }, Cmd.none)
    Alert -> (model, Cmd.none)

view : Model -> Html Msg
view model =
  div []
    [ input [ placeholder "Enter alert message", onInput Change ] []
    , button [ onClick Alert ] [ text "Show Alert!" ]
    ]
```

Now, compile it to create the js file:

`elm-make Notify.elm --output notify.js`

And the corresponding `html` file:

``` html
<!DOCTYPE html>
<html>
<head>
<title>Sample Elm app</title>
</head>
<body>
</body>
<script src="./notify.js"></script> 
<script>
    var app = Elm.Notify.fullscreen();
</script>
</html> 
```

## The Integration part

Now let's do the integration with the jQuery plugin. There are four steps for it:

* Change the first line of the Elm code to indicate that it is a port module:

    `port module Notify exposing (..)`

* Add type signature for the port function:

    `port alert : String -> Cmd msg`

* Handle `Alert` case properly in the `update` function:

    `    Alert -> (model, alert model.content)`

* Connect the Plugin with the Elm part in the HTML code:

``` html
<script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/jquery/2.2.3/jquery.js"></script>
<script type="text/javascript" src="./notifyLib.js"></script>
<script src="./notify.js"></script> 
<script>
    var app = Elm.Notify.fullscreen();
    app.ports.alert.subscribe(function(word) {
      $.notify(word);
    });
</script>
```

And voila, you get a alert:

![Alert notification using notifyjs](/images/posts/elm-alert.png)

For a more complex example, you can refer to the [elm guide](http://guide.elm-lang.org/interop/javascript.html) which also shows the use of `subscription`.
