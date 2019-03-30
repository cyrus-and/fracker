curl "$url/tracking.php?GET_key=GET_value"
curl -d 'POST_key=POST_value' "$url/tracking.php"
curl -b 'COOKIE_key=COOKIE_value' "$url/tracking.php"
curl -H 'HEADER_key: HEADER_value' "$url/tracking.php"
