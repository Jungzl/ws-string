/**
 * Created by user on 2017/12/8/008.
 */

import * as deepmerge from 'deepmerge';

export namespace FullHalfCore
{
	export const FULL_WIDTH = 1;
	export const HALF_WIDTH = 0;

	export interface IOptionsType
	{
		eng?: boolean,
		number?: boolean,

		/**
		 * eng & number
		 */
		both?: boolean;

		space?: boolean;
		exists?: boolean;

		default?: boolean;
		not_default?: boolean;

		[index: string]: boolean;
	}

	export interface IOptions
	{
		type?: number;

		skip?: IOptionsType;
		only?: IOptionsType;

		mode?: {
			only?: boolean,

			[index: string]: boolean;
		};

		returnType?: number;
	}

	export interface ITableObject
	{
		from?: number;
		to?: number;

		values?: number[];

		not?: ITableObject[],
	}

	export interface ITable
	{
		default?: ITableObject;

		number?: ITableObject;
		space?: ITableObject;

		'A-Z'?: ITableObject;
		'a-z'?: ITableObject;

		not_default?: ITableObject;

		[index: string]: ITableObject;
	}

	/**
	 * @see https://en.wikipedia.org/wiki/Code_page_437
	 */
	let _table = {
		default: {
			from: 0x0020 + 1,
			to: 0x007F - 1,
			values: [0x0020],
		},

		number: [0x0030, 0x0039],

		'A-Z': [0x0041, 0x005A],
		'a-z': [0x0061, 0x007A],

		space: [0x0020],
	};

	export let tableDefaultInclude = [
		'number',
		'A-Z',
		'a-z',
		'space',
		'not_default',
	];

	export let table: ITable[] = [];

	{
		let _keys = tableDefaultInclude.slice(0, -1);

		table[0] = {};
		table[1] = {};

		for (let k in _table)
		{
			let v = _table[k];

			let r;

			r = fn(v);

			if (r)
			{
				table[HALF_WIDTH][k] = r[1];
				table[FULL_WIDTH][k] = r[0];
			}
		}

		let r = fn(_table.default);

		r[0].not = [];
		r[1].not = [];

		for (let k of _keys)
		{
			let v = _table[k];

			let r2;

			r2 = fn(v);

			if (r2)
			{
				r[0].not.push(r2[0]);
				r[1].not.push(r2[1]);
			}
		}

		table[HALF_WIDTH]['not_default'] = r[1];
		table[FULL_WIDTH]['not_default'] = r[0];

		//console.log(table);

		function fn(v)
		{
			let r: ITableObject[] = [];

			r[0] = {};
			r[1] = {};

			let _skip = true;

			if (Array.isArray(v))
			{
				if (v.length == 2)
				{
					r[0].from = v[0];
					r[0].to = v[1];
				}
				else
				{
					r[0].values = v;
				}

				_skip = false;
			}

			if (v.from && v.to)
			{
				r[0].from = v.from;
				r[0].to = v.to;

				_skip = false;
			}

			if (Array.isArray(v.values) && v.values.length)
			{
				r[0].values = v.values;

				_skip = false;
			}

			if (_skip)
			{
				return;
			}

			if (r[0].from && r[0].to)
			{
				r[1].from = toFullWidth(r[0].from);
				r[1].to = toFullWidth(r[0].to);
			}

			if (r[0].values)
			{
				r[1].values = (r[0].values as number[]).reduce(function (a, code)
				{
					a.push(toFullWidth(code));

					return a;
				}, []);
			}

			return r;
		}
	}

	export function filterTable(data)
	{
		let _a = [];

		if (data.from && data.to)
		{
			for (let i = data.from; i<=data.to; i++)
			{
				_a.push(i);
			}
		}

		if (data.values)
		{
			_a = _a.concat(data.values)
		}

		if (Array.isArray(data.not) && data.not.length)
		{
			_a = _a.filter(function (charCode)
			{
				for (let d of data.not)
				{
					if (_chkType(charCode, d))
					{
						return false;
					}
				}

				return true;
			});
		}

		return _a;
	}

	export function _chkType(charCode: number, data: ITableObject)
	{
		if (data.from && data.to && data.from <= charCode && charCode <= data.to)
		{
			return true;
		}
		else if (data.values && data.values.includes(charCode))
		{
			return true;
		}
	}

	export function chkType(charCode: number, key: string, type: number)
	{
		let data = table[type][key];

		//console.log(charCode, data);

		if (Array.isArray(data.not) && data.not.length)
		{
			for (let d of data.not)
			{
				if (_chkType(charCode, d))
				{
					return false;
				}
			}
		}

		if (_chkType(charCode, data))
		{
			return true;
		}
	}

	export function toFullWidth(charCode: number)
	{
		if (0x0020 < charCode && charCode < 0x007F)
		{
			return 0xFF00 + (charCode - 0x0020);
		}

		if (0x0020 === charCode)
		{
			return 0x3000;
		}

		return charCode;
	}

	export function toHalfWidth(charCode: number)
	{
		if (0xFF00 < charCode && charCode < 0xFF5F)
		{
			return 0x0020 + (charCode - 0xFF00);
		}

		if (0x3000 === charCode)
		{
			return 0x0020;
		}

		return charCode;
	}

	function _optionsType(data: IOptionsType)
	{
		if (data)
		{
			if (data.exists)
			{
				for (let key in table[0])
				{
					if (key.indexOf('default') == 0)
					{
						continue;
					}

					if (data[key] !== false)
					{
						data[key] = true;
					}
				}

				delete data.exists;
			}
			else
			{
				if (data.default)
				{
					for (let key in tableDefaultInclude)
					{
						if (data[key] !== false)
						{
							data[key] = true;
						}
					}

					delete data.default;
				}

				if (data.both)
				{
					data.number = data.eng = true;
					delete data.both;
				}

				if (data.eng)
				{
					data['a-z'] = data['A-Z'] = true;
					delete data.eng;
				}
			}
		}

		return data;
	}

	export function process<T>(str: string, charProcess, options: IOptions)
	{
		let ret = [];

		options.skip = _optionsType(options.skip);
		options.only = _optionsType(options.only);

		//console.log(options);

		for (let char of str)
		{
			let _skip;

			// @ts-ignore
			let charCode = char.charCodeAt();

			if (options.only)
			{
				_skip = true;

				for (let key in options.only)
				{
					//console.log(char, charCode, [key], chkType(charCode, key, options.type));

					if (options.only[key] && chkType(charCode, key, options.type))
					{
						_skip = false;
						break;
					}
				}

				//console.log(char, charCode, _skip);
			}

			if (!_skip && options.skip)
			{
				for (let key in options.skip)
				{
					if (options.skip[key] && chkType(charCode, key, options.type))
					{
						_skip = true;
						break;
					}
				}
			}

			if (_skip)
			{
				ret.push(charCode);
				continue;
			}

			ret.push(charProcess(charCode));
		}

		if (options.returnType)
		{
			return ret as number[];
		}

		return String.fromCharCode.apply(String, ret) as T;
	}

	export function factory<T = string>(charProcessor, type: number, overwriteOptions?: IOptions)
	{
		return (str: string, options?: IOptions) =>
		{
			options = deepmerge.all([
				{
					//skip: {},
				}, options || {}, overwriteOptions || {}, {
					type: type,
				},
			]);

			//console.log(options);

			return process<T>(str, charProcessor, options) as T;
		}
	}
}

let typeOnly: FullHalfCore.IOptions = {
	only: {
		number: true,
	},
};

export const toFullNumber = FullHalfCore.factory<string>(FullHalfCore.toFullWidth, FullHalfCore.FULL_WIDTH, typeOnly);
export const toHalfNumber = FullHalfCore.factory<string>(FullHalfCore.toHalfWidth, FullHalfCore.HALF_WIDTH, typeOnly);

typeOnly = {
	only: {
		eng: true,
	},
};

export const toFullEnglish = FullHalfCore.factory<string>(FullHalfCore.toFullWidth, FullHalfCore.FULL_WIDTH, typeOnly);
export const toHalfEnglish = FullHalfCore.factory<string>(FullHalfCore.toHalfWidth, FullHalfCore.HALF_WIDTH, typeOnly);

// ---

export const toFullWidth = FullHalfCore.factory<string>(FullHalfCore.toFullWidth, FullHalfCore.FULL_WIDTH);
export const toHalfWidth = FullHalfCore.factory<string>(FullHalfCore.toHalfWidth, FullHalfCore.HALF_WIDTH);

// @ts-ignore
export default exports;

//console.log(toFullEnglish('123abcABCＡＢＣ１２３／＊－＋＝－０］［’；／．+-*/=-09][\'";/.'));
//console.log(toHalfEnglish('123abcABCＡＢＣ１２３／＊－＋＝－０］［’；／．+-*/=-09][\'";/.'));
//console.log(toFullNumber('123abcABCＡＢＣ１２３／＊－＋＝－０］［’；／．+-*/=-09][\'";/.'));
//console.log(toHalfNumber('123abcABCＡＢＣ１２３／＊－＋＝－０］［’；／．+-*/=-09][\'";/.'));
