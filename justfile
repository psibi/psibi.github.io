default:
    @just --list

# Build static assets
build:
    zola build

serve:
    zola serve

clean:
    rm -rf docs/

new-post slug:
    @mkdir -p content/posts
    @fp="content/posts/$(date +%Y-%m-%d)-{{slug}}.md" && \
    printf '+++\ntitle = "{{slug}}"\ndate = "%s"\n+++\n' "$(date +%Y-%m-%d)" > "$fp"

open:
	xdg-open http://localhost:1111
