---
title: Replacing headers in Yesod
author: Sibi
---

Recently a issue
was
[raised in the bug tracker](https://github.com/yesodweb/yesod/issues/1415) regarding
the way to overwrite a HTTP response header in Yesod. Maximilian
Tagher
[brought a valid point](https://github.com/yesodweb/yesod/issues/1415#issuecomment-313882369) that
multiple header values are indeed acceptable according to the HTTP RFC
specification. Further down the conversation, it was suggested to use
WAI middleware for controlling the response. But again, this was a
workaround and not a clean solution IMO.

## Is this a sane thing to do ?

My first question was whether replacing header value was a sane thing
to do in the framework level ? I went on to see if other framework are
providing
this. Both
[Django framework](https://docs.djangoproject.com/en/1.11/ref/request-response/#setting-header-fields) and
[Express.js](https://stackoverflow.com/a/17219300/1651941) allowed
modifying them. Given that the ecosystem in Python and Node.js allowed
that, it meant that we are missing that in our Yesod. 

## Yeah, go for it!

So armed with the knowledge that it wouldn't be a wrong thing to do, I
decided to add the relevant functionaity to Yesod. My initial patch
didn't take into the account that the header names are case
insensitive according to the specification. After some iteration and
refinement, this was the final working code:

``` haskell
replaceOrAddHeader :: MonadHandler m => Text -> Text -> m ()
replaceOrAddHeader a b =
  modify $ \g -> g {ghsHeaders = replaceHeader (ghsHeaders g)}
  where
    repHeader = Header (encodeUtf8 a) (encodeUtf8 b)

    sameHeaderName :: Header -> Header -> Bool
    sameHeaderName (Header n1 _) (Header n2 _) = T.toLower (decodeUtf8 n1) == T.toLower (decodeUtf8 n2)
    sameHeaderName _ _ = False

    replaceIndividualHeader :: [Header] -> [Header]
    replaceIndividualHeader [] = [repHeader]
    replaceIndividualHeader xs = aux xs []
      where
        aux [] acc = acc ++ [repHeader]
        aux (x:xs') acc =
          if sameHeaderName repHeader x
            then acc ++
                 [repHeader] ++
                 (filter (\header -> not (sameHeaderName header repHeader)) xs')
            else aux xs' (acc ++ [x])

    replaceHeader :: Endo [Header] -> Endo [Header]
    replaceHeader endo =
      let allHeaders :: [Header] = appEndo endo []
      in Endo (\rest -> replaceIndividualHeader allHeaders ++ rest)
```

I merged the [PR](https://github.com/yesodweb/yesod/pull/1417) two
days ago. This function will be available under the module
`Yesod.Core.Handler` from `yesod-core-1.4.36`. Thanks to Paul Rose and
Michael Snoyman for the detailed review. One design issue I observed
while creating the patch was the the `Header` filed was represented by
a `ByteString`. I have opened
a [new issue](https://github.com/yesodweb/yesod/issues/1418) to move
it to a `CI` type constructor for case insensitive equality
checking. I will try to make that change in the next major release of
Yesod as it breaks backward compatibility. That will help in cleaning
up the above code slightly.
