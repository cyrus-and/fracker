curl "$url"
curl -d 'POST_key=POST_value' -b 'COOKIE_key=COOKIE_value' -H 'HEADER_key: HEADER_value' "$url/?GET_key=GET_value"
