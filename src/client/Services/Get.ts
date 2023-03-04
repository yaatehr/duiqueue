export default async function Get(
    url: string,
    params: Record<string, string> = {},
    headers:Record<string, unknown> = {}
): Promise<any>{
    console.log(url, params, headers);
    console.log(new URLSearchParams(params).toString());
    url = url + '?' + new URLSearchParams(params).toString();
    try {
        const response: Response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                ...headers
            },
        });
        return response.json();
    } catch (e) {
    console.log(e);
    }
}
