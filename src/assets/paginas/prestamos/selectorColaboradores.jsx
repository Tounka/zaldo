import { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { FaCheck, FaChevronDown, FaSearch, FaUserTie } from "react-icons/fa";

const SelectorWrapper = styled.div`
  position: relative;
  width: 100%;
`;

const SelectorButton = styled.button`
  width: 100%;
  min-height: 46px;
  padding: 8px 12px;
  border: 1px solid rgba(83, 59, 143, 0.26);
  border-radius: 11px;
  background: #fff;
  color: #1a1a2e;
  display: flex;
  align-items: center;
  gap: 9px;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;

  &:hover,
  &:focus-visible {
    border-color: var(--colorMorado);
    box-shadow: 0 0 0 3px rgba(83, 59, 143, 0.1);
    outline: none;
  }
`;

const ButtonText = styled.span`
  flex: 1;
  min-width: 0;
  font-size: 13px;
  color: ${({ $muted }) => ($muted ? "rgba(26, 26, 46, 0.65)" : "#1a1a2e")};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Chevron = styled(FaChevronDown)`
  color: #777;
  font-size: 11px;
  flex-shrink: 0;
`;

const Dropdown = styled.div`
  position: absolute;
  z-index: 20;
  top: calc(100% + 7px);
  left: 0;
  right: 0;
  background: #fff;
  border: 1px solid rgba(83, 59, 143, 0.18);
  border-radius: 14px;
  padding: 10px;
  box-shadow: 0 18px 40px rgba(31, 24, 59, 0.18);
`;

const SearchBox = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 9px;
  background: rgba(83, 59, 143, 0.055);
  color: #777;

  input {
    width: 100%;
    border: 0;
    outline: 0;
    background: transparent;
    color: #1a1a2e;
    font-size: 12px;
  }

  input::placeholder {
    color: rgba(26, 26, 46, 0.8);
  }
`;

const Options = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  max-height: 220px;
  overflow-y: auto;
  margin-top: 8px;
`;

const Option = styled.button`
  width: 100%;
  border: 0;
  border-radius: 9px;
  background: ${({ $selected }) => ($selected ? "rgba(83, 59, 143, 0.09)" : "transparent")};
  color: #1a1a2e;
  padding: 9px 10px;
  display: flex;
  align-items: center;
  gap: 9px;
  text-align: left;
  cursor: pointer;

  &:hover {
    background: rgba(83, 59, 143, 0.08);
  }
`;

const Avatar = styled.span`
  width: 28px;
  height: 28px;
  border-radius: 9px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--colorMorado);
  background: rgba(83, 59, 143, 0.11);
  font-size: 11px;
`;

const OptionCopy = styled.span`
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  flex: 1;
`;

const OptionName = styled.span`
  font-size: 12px;
  font-weight: 800;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const OptionMeta = styled.span`
  color: rgba(26, 26, 46, 0.62);
  font-size: 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Check = styled.span`
  width: 18px;
  height: 18px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: ${({ $selected }) => ($selected ? "var(--colorMorado)" : "transparent")};
  border: 1px solid ${({ $selected }) => ($selected ? "var(--colorMorado)" : "rgba(83, 59, 143, 0.28)")};
  font-size: 10px;
`;

const Empty = styled.div`
  padding: 14px 10px 6px;
  text-align: center;
  color: rgba(26, 26, 46, 0.58);
  font-size: 11px;
`;

const getUserName = (user) =>
  [user.nombres, user.apellidos].filter(Boolean).join(" ").trim()
  || user.nombre
  || user.displayName
  || user.correo
  || user.email
  || user.uid
  || "Colaborador";

const getUserEmail = (user) => user.correo || user.email || "";

export const normalizarColaboradores = (usuarios = []) =>
  usuarios
    .filter((user) => user?.uid)
    .map((user) => ({
      ...user,
      etiqueta: getUserName(user),
      correoVisible: getUserEmail(user),
    }))
    .sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, "es"));

export const SearchableCollaboratorSelect = ({
  usuarios = [],
  value = "",
  onChange,
  multiple = false,
  placeholder = "Buscar colaborador...",
  emptyLabel = "No hay colaboradores que coincidan",
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const rootRef = useRef(null);
  const lista = useMemo(() => normalizarColaboradores(usuarios), [usuarios]);
  const selectedValues = multiple ? (Array.isArray(value) ? value : []) : (value ? [value] : []);
  const selectedUsers = lista.filter((user) => selectedValues.includes(user.uid));

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return lista;
    return lista.filter((user) => `${user.etiqueta} ${user.correoVisible} ${user.uid}`.toLowerCase().includes(term));
  }, [lista, search]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const toggleValue = (uid) => {
    if (multiple) {
      const next = selectedValues.includes(uid)
        ? selectedValues.filter((item) => item !== uid)
        : [...selectedValues, uid];
      onChange?.(next);
      return;
    }
    onChange?.(selectedValues[0] === uid ? "" : uid);
    setOpen(false);
    setSearch("");
  };

  const label = selectedUsers.length === 0
    ? placeholder
    : selectedUsers.length === 1
      ? selectedUsers[0].etiqueta
      : `${selectedUsers.length} colaboradores seleccionados`;

  return (
    <SelectorWrapper ref={rootRef}>
      <SelectorButton type="button" onClick={() => setOpen((current) => !current)} aria-expanded={open}>
        <FaUserTie color="var(--colorMorado)" />
        <ButtonText $muted={selectedUsers.length === 0}>{label}</ButtonText>
        <Chevron />
      </SelectorButton>

      {open && (
        <Dropdown>
          <SearchBox>
            <FaSearch size={11} />
            <input
              autoFocus
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Busca por nombre, correo o UID..."
              aria-label="Buscar colaborador"
            />
          </SearchBox>
          <Options>
            {!multiple && (
              <Option type="button" $selected={selectedValues.length === 0} onClick={() => { onChange?.(""); setOpen(false); setSearch(""); }}>
                <Avatar><FaUserTie /></Avatar>
                <OptionCopy>
                  <OptionName>Sin asignar</OptionName>
                  <OptionMeta>Visible solo para administración</OptionMeta>
                </OptionCopy>
                <Check $selected={selectedValues.length === 0}>{selectedValues.length === 0 && <FaCheck />}</Check>
              </Option>
            )}
            {filtered.map((user) => {
              const selected = selectedValues.includes(user.uid);
              return (
                <Option key={user.uid} type="button" $selected={selected} onClick={() => toggleValue(user.uid)}>
                  <Avatar>{user.etiqueta.slice(0, 1).toUpperCase()}</Avatar>
                  <OptionCopy>
                    <OptionName>{user.etiqueta}</OptionName>
                    <OptionMeta>{user.correoVisible || `UID: ${user.uid}`}</OptionMeta>
                  </OptionCopy>
                  <Check $selected={selected}>{selected && <FaCheck />}</Check>
                </Option>
              );
            })}
            {filtered.length === 0 && <Empty>{emptyLabel}</Empty>}
          </Options>
        </Dropdown>
      )}
    </SelectorWrapper>
  );
};
